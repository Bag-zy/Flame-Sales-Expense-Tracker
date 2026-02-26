"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

# Apply patch for CopilotKit import issue before any other imports
# This fixes the incorrect import path in copilotkit.langgraph_agent (bug in v0.1.63)
import sys

# Only apply the patch if the module doesn't already exist
if 'langgraph.graph.graph' not in sys.modules:
    # Create a mock module for the incorrect import path that CopilotKit expects
    class _MockModule:
        pass

    # Import the necessary modules first
    import langgraph
    import langgraph.graph
    import langgraph.graph.state

    # Import CompiledStateGraph from the correct location
    from langgraph.graph.state import CompiledStateGraph

    # Create the fake module path that CopilotKit incorrectly expects
    _mock_graph_module = _MockModule()
    _mock_graph_module.CompiledGraph = CompiledStateGraph

    # Add it to sys.modules so CopilotKit's incorrect import will work
    sys.modules['langgraph.graph.graph'] = _mock_graph_module

# Patch for missing langchain.agents.middleware (bug in some copilotkit/langchain version combos)
if 'langchain.agents.middleware' not in sys.modules:
    class _MockMiddleware:
        def __getitem__(self, _): return object
    
    _mock_middleware_module = type('Module', (), {
        'AgentMiddleware': _MockMiddleware(),
        'AgentState': object,
        'ModelRequest': object,
        'ModelResponse': object,
    })
    sys.modules['langchain.agents.middleware'] = _mock_middleware_module

import os
from typing import Any, List, Optional, Dict
from typing_extensions import Literal
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from copilotkit.langgraph import CopilotKitState
from langgraph.prebuilt import ToolNode
from langgraph.types import interrupt

class AgentState(CopilotKitState):
    """
    State for the Flame Assistant
    """
    tools: List[Any] = []
    
    # Financial context synced from the Flame Next.js React frontend
    userContext: str = ""
    activeOrganizationId: str = ""
    activeProjectId: str = ""
    activeCycleId: str = ""
    currentView: str = ""
    
    lastAction: str = ""
    itemsCreated: int = 0
    
    # Planning state
    planSteps: List[Dict[str, Any]] = []
    currentStepIndex: int = -1
    planStatus: str = ""


@tool
def set_plan(steps: List[str]):
    """
    Initialize a plan consisting of step descriptions. Resets progress and sets status to 'in_progress'.
    """
    return {"initialized": True, "steps": steps}

@tool
def update_plan_progress(step_index: int, status: Literal["pending", "in_progress", "completed", "blocked", "failed"], note: Optional[str] = None):
    """
    Update a single plan step's status, and optionally add a note.
    """
    return {"updated": True, "index": step_index, "status": status, "note": note}

@tool
def complete_plan():
    """
    Mark the plan as completed.
    """
    return {"completed": True}

# @tool
# def your_tool_here(your_arg: str):
#     """Your tool description here."""
#     print(f"Your tool logic here")
#     return "Your tool response here."

backend_tools = [
    set_plan,
    update_plan_progress,
    complete_plan,
]

# Extract tool names from backend_tools for comparison
backend_tool_names = [tool.name for tool in backend_tools]

# Frontend tool allowlist to keep tool count under API limits and avoid noise
FRONTEND_TOOL_ALLOWLIST = set([
    # Query tools (Read)
    "listOrganizations",
    "listProjects",
    "listCycles",
    "listSales",
    "listExpenses",
    "getCurrentContext",
    # Detail view tools
    "viewOrganizationDetails",
    "viewProjectDetails",
    "viewCycleDetails",
    "viewSaleDetails",
    "viewExpenseDetails",
    "viewCustomerDetails",
    # Edit tools (open edit forms)
    "editOrganization",
    "editProject",
    "editCycle",
    "editSale",
    "editExpense",
    # Open creation forms tools
    "openExpenseForm",
    "openVendorForm",
    "openPaymentMethodForm",
    "openSaleForm",
    "openInvoiceForm",
    "openCustomerForm",
    "openProjectForm",
    "openOrganizationForm",
    "openCycleForm",
    "openInventoryForm",
    # Create tools
    "createOrganization",
    "createProject",
    "createCycle",
    "recordSale",
    "logExpense",
    "generateInvoice",
    # Update tools (API calls)
    "updateOrganization",
    "updateProject",
    "updateCycle",
    "updateSale",
    "updateExpense",
    # Delete tools
    "deleteProject",
    "deleteCycle",
    "deleteSale",
    "deleteExpense",
    # Navigation
    "navigateWorkspace",
])


async def chat_node(state: AgentState, config: RunnableConfig) -> Command[Literal["tool_node", "__end__"]]:
    print(f"state: {state}")
    """
    Standard chat node based on the ReAct design pattern. It handles:
    - The model to use (and binds in CopilotKit actions and the tools defined above)
    - The system prompt
    - Getting a response from the model
    - Handling tool calls

    For more about the ReAct design pattern, see:
    https://www.perplexity.ai/search/react-agents-NcXLQhreS0WDzpVaS4m9Cg
    """

    # 1. Define the model
    model = ChatGroq(model=os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct-0905"))

    # 2. Prepare and bind tools to the model (dedupe, allowlist, and cap)
    def _extract_tool_name(tool: Any) -> Optional[str]:
        """Extract a tool name from either a LangChain tool or an OpenAI function spec dict."""
        try:
            # OpenAI tool spec dict: { "type": "function", "function": { "name": "..." } }
            if isinstance(tool, dict):
                fn = tool.get("function", {}) if isinstance(tool.get("function", {}), dict) else {}
                name = fn.get("name") or tool.get("name")
                if isinstance(name, str) and name.strip():
                    return name
                return None
            # LangChain tool object or @tool-decorated function
            name = getattr(tool, "name", None)
            if isinstance(name, str) and name.strip():
                return name
            return None
        except Exception:
            return None

    # Frontend tools may arrive either under state["tools"] or within the CopilotKit envelope
    raw_tools = (state.get("tools", []) or [])
    try:
        ck = state.get("copilotkit", {}) or {}
        raw_actions = ck.get("actions", []) or []
        if isinstance(raw_actions, list) and raw_actions:
            raw_tools = [*raw_tools, *raw_actions]
    except Exception:
        pass

    deduped_frontend_tools: List[Any] = []
    seen: set[str] = set()
    for t in raw_tools:
        name = _extract_tool_name(t)
        if not name:
            continue
        if name not in FRONTEND_TOOL_ALLOWLIST:
            continue
        if name in seen:
            continue
        seen.add(name)
        deduped_frontend_tools.append(t)

    # cap to well under 128 (OpenAI tools limit), leaving room for backend tools
    MAX_FRONTEND_TOOLS = 110
    if len(deduped_frontend_tools) > MAX_FRONTEND_TOOLS:
        deduped_frontend_tools = deduped_frontend_tools[:MAX_FRONTEND_TOOLS]

    model_with_tools = model.bind_tools(
        [
            *deduped_frontend_tools,
            *backend_tools,
        ],
        parallel_tool_calls=False,
    )

    # 3. Define the system message by which the chat model will be run
    userContext = state.get("userContext", "Unknown User Context")
    activeOrganizationId = state.get("activeOrganizationId", "None")
    activeProjectId = state.get("activeProjectId", "None")
    activeCycleId = state.get("activeCycleId", "None")
    currentView = state.get("currentView", "Unknown")
    lastAction = state.get("lastAction", "None")
    
    post_tool_guidance = state.get("__last_tool_guidance", None)
    plan_steps = state.get("planSteps", []) or []
    current_step_index = state.get("currentStepIndex", -1)
    plan_status = state.get("planStatus", "")

    system_message = SystemMessage(
        content=(
            "IDENTITY & PURPOSE:\n"
            "You are Flame, an elite AI financial assistant integrated deeply into the Flame Sales and Expense Tracker application. "
            "Your singular goal is to help your User efficiently manage their workspaces, track sales, log expenses, monitor inventory, and analyze financial data. "
            "You communicate concisely, professionally, and always prioritize completing the user's financial tasks quickly.\n\n"
            
            "GLOBAL CONTEXT (LATEST GROUND TRUTH):\n"
            f"User Context: {userContext}\n"
            f"Active Organization ID: {activeOrganizationId}\n"
            f"Active Project ID: {activeProjectId}\n"
            f"Active Cycle ID: {activeCycleId}\n"
            f"Current Dashboard URL/View: {currentView}\n"
            f"Last Action Completed: {lastAction}\n"
            f"Plan Status: {plan_status}\n"
            f"Current Step Index: {current_step_index}\n"
            f"Plan Steps: {[s.get('title', s) for s in plan_steps]}\n\n"
            
            "APPLICATION DOMAIN & ARCHITECTURE:\n"
            "The Flame app is a hierarchical CRM and financial tracker organized as follows:\n"
            "1. WORKSPACES: Organizations contain Projects. Projects contain Cycles (time-bound periods like 'Q1 2026'). All financial data belongs to a Cycle.\n"
            "2. SALES & INVOICING: Users input Sales (tied to Customers, Products, Variants) and generate Invoices. Sales must track payment methods and amounts.\n"
            "3. EXPENSES: Users log Expenses (tied to Vendors and Expense Categories) with dates, amounts, and descriptions. Includes receipt tracking.\n"
            "4. INVENTORY: The system tracks Items (Finished Goods vs Raw Materials), current stock levels, and production orders. Inventory decreases when Sales occur.\n"
            "5. ANALYTICS & REPORTS: The app generates real-time dashboards (Total Sales, Net Profit) and downloadable reports for chosen Cycles/Projects.\n\n"
            
            "TOOL EXECUTION POLICY:\n"
            "- You have access to specialized tools (e.g., `createProject`, `logExpense`, `recordSale`).\n"
            "- You must ALWAYS use these tools to perform actions requested by the user. "
            "Never tell the user you 'updated their data' if you did not successfully call a tool.\n"
            "- If a user makes a vague request (e.g., 'Log $50 for supplies'), use the specific `open...Form` tools (e.g. `openExpenseForm`, `openSaleForm`) to open the relevant creation form for them to fill out themselves, OR if you have a direct API tool and only need one or two pieces of missing data, ask for it and then execute the API tool.\n"
            "- You do NOT manage a generic 'Canvas' of cards. You are managing real financial database records.\n"
            "- Do not loop the same tool call. Execute the tool, summarize the result based on the Ground Truth update, and wait for the user.\n\n"
            
            "PLANNING POLICY (MULTI-STEP REQUESTS):\n"
            "- If the user makes a complex request ('Set up a new Org, create a Project, and log 3 initial expenses'), you must propose a plan.\n"
            "- Call the `set_plan` tool to outline the steps.\n"
            "- Use `update_plan_progress` as you execute the required Tools for each step (e.g., calling `createOrganization`).\n"
            "- Call `complete_plan` only when every step is successfully executed against the database.\n\n"
            
            "STRICT GROUNDING RULES:\n"
            "1. ALWAYS read the GLOBAL CONTEXT provided above to know what the user is currently looking at.\n"
            "2. If the user says 'Delete this project', use `activeProjectId`. If it is 'None', ask the user which project they mean.\n"
            "3. If you lack required information to execute a financial log (e.g., missing an Expense Category ID), ask the user for it or use a tool to fetch available categories.\n"
            "4. NEVER invent or hallucinate financial quantities, prices, or IDs. Only use data provided in the Ground Truth or via Tool outputs.\n"
            "5. If a user asks a question entirely unrelated to financial tracking, inventory, or CRM management, politely remind them you are Flame, the Sales and Expense Tracker assistant.\n"
            + (f"\nPOST-TOOL POLICY:\n{post_tool_guidance}\n" if post_tool_guidance else "")
        )
    )

    # 4. Run the model to generate a response
    # If the user asked to modify an item but did not specify which, interrupt to choose
    try:
        last_user = next((m for m in reversed(state["messages"]) if getattr(m, "type", "") == "human"), None)
        if last_user and any(k in last_user.content.lower() for k in ["item", "rename", "owner", "priority", "status"]) and not any(k in last_user.content.lower() for k in ["prj_", "item id", "id="]):
            choice = interrupt({
                "type": "choose_item",
                "content": "Please choose which item you mean.",
            })
            state["chosen_item_id"] = choice
    except Exception:
        pass

    # 4.1 If the latest message contains unresolved FRONTEND tool calls, do not call the LLM yet.
    #     End the turn and wait for the client to execute tools and append ToolMessage responses.
    full_messages = state.get("messages", []) or []
    try:
        if full_messages:
            last_msg = full_messages[-1]
            if isinstance(last_msg, AIMessage):
                pending_frontend_call = False
                for tc in getattr(last_msg, "tool_calls", []) or []:
                    name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
                    if name and name not in backend_tool_names:
                        pending_frontend_call = True
                        break
                if pending_frontend_call:
                    return Command(
                        goto=END,
                        update={
                            # no changes; just wait for the client to respond with ToolMessage(s)
                            "userContext": state.get("userContext", ""),
                            "activeOrganizationId": state.get("activeOrganizationId", ""),
                            "activeProjectId": state.get("activeProjectId", ""),
                            "activeCycleId": state.get("activeCycleId", ""),
                            "currentView": state.get("currentView", ""),
                            "lastAction": state.get("lastAction", ""),
                            "itemsCreated": state.get("itemsCreated", 0),
                            "planSteps": state.get("planSteps", []),
                            "currentStepIndex": state.get("currentStepIndex", -1),
                            "planStatus": state.get("planStatus", ""),
                        },
                    )
    except Exception:
        pass

    # 4.2 Trim long histories to reduce stale context influence and suppress typing flicker
    trimmed_messages = full_messages[-12:]

    # 4.3 Append a final, authoritative state snapshot after chat history
    #
    # Ensure the latest shared state takes priority over chat history and
    # stale tool results. This enforces state-first grounding, reduces drift, and makes
    # precedence explicit. Optional post-tool guidance confirms successful actions
    # (e.g., deletion) instead of re-stating absence.
    latest_state_system = SystemMessage(
        content=(
            "LATEST GROUND TRUTH (authoritative):\n"
            f"- User Context: {userContext}\n"
            f"- Active Organization ID: {activeOrganizationId}\n"
            f"- Active Project ID: {activeProjectId}\n"
            f"- Active Cycle ID: {activeCycleId}\n"
            f"- Current Dashboard URL/View: {currentView}\n"
            f"- Last Action Completed: {lastAction}\n\n"
            f"- planStatus: {plan_status}\n"
            f"- currentStepIndex: {current_step_index}\n"
            f"- planSteps: {[s.get('title', s) for s in plan_steps]}\n\n"
            "Resolution policy: If ANY prior message mentions values that conflict with the above,\n"
            "those earlier mentions are obsolete and MUST be ignored.\n"
            "When asked 'what is it now', ALWAYS read from this LATEST GROUND TRUTH.\n"
            + ("\nIf the last tool result indicated success (e.g., 'deleted:ID'), confirm the action rather than re-stating absence." if post_tool_guidance else "")
        )
    )

    response = await model_with_tools.ainvoke([
        system_message,
        *trimmed_messages,
        latest_state_system,
    ], config)

    # Predictive plan state updates based on imminent tool calls (for UI rendering)
    try:
        tool_calls = getattr(response, "tool_calls", []) or []
        predicted_plan_steps = plan_steps.copy()
        predicted_current_index = current_step_index
        predicted_plan_status = plan_status
        for tc in tool_calls:
            name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
            args = tc.get("args") if isinstance(tc, dict) else getattr(tc, "args", {})
            if not isinstance(args, dict):
                try:
                    import json as _json
                    args = _json.loads(args)  # sometimes args can be a json string
                except Exception:
                    args = {}
            if name == "set_plan":
                raw_steps = args.get("steps") or []
                predicted_plan_steps = [{"title": s if isinstance(s, str) else str(s), "status": "pending"} for s in raw_steps]
                if predicted_plan_steps:
                    predicted_plan_steps[0]["status"] = "in_progress"
                    predicted_current_index = 0
                    predicted_plan_status = "in_progress"
                else:
                    predicted_current_index = -1
                    predicted_plan_status = ""
            elif name == "update_plan_progress":
                idx = args.get("step_index")
                status = args.get("status")
                note = args.get("note")
                if isinstance(idx, int) and 0 <= idx < len(predicted_plan_steps) and isinstance(status, str):
                    if note:
                        predicted_plan_steps[idx]["note"] = note
                    predicted_plan_steps[idx]["status"] = status
                    if status == "in_progress":
                        predicted_current_index = idx
                        predicted_plan_status = "in_progress"
                    if status == "completed" and idx >= predicted_current_index:
                        predicted_current_index = idx
            elif name == "complete_plan":
                for i in range(len(predicted_plan_steps)):
                    if predicted_plan_steps[i].get("status") != "completed":
                        predicted_plan_steps[i]["status"] = "completed"
                predicted_plan_status = "completed"
        # Aggregate overall plan status conservatively and manage progression
        if predicted_plan_steps:
            statuses = [str(s.get("status", "")) for s in predicted_plan_steps]
            # Do NOT auto-mark overall plan completed unless complete_plan is called.
            # We still reflect failure if any step failed.
            if any(st == "failed" for st in statuses):
                predicted_plan_status = "failed"
            elif any(st == "in_progress" for st in statuses):
                predicted_plan_status = "in_progress"
            elif any(st == "blocked" for st in statuses):
                predicted_plan_status = "blocked"
            else:
                predicted_plan_status = predicted_plan_status or ""

            # Only promote a new step when the previously active step transitioned to completed
            active_idx = next((i for i, s in enumerate(predicted_plan_steps) if str(s.get("status", "")) == "in_progress"), -1)
            if active_idx == -1:
                # find last completed and promote the next pending, else first pending
                last_completed = -1
                for i, s in enumerate(predicted_plan_steps):
                    if str(s.get("status", "")) == "completed":
                        last_completed = i
                # Prefer the immediate next step after the last completed
                promote_idx = next((i for i in range(last_completed + 1, len(predicted_plan_steps)) if str(predicted_plan_steps[i].get("status", "")) == "pending"), -1)
                if promote_idx == -1:
                    promote_idx = next((i for i, s in enumerate(predicted_plan_steps) if str(s.get("status", "")) == "pending"), -1)
                if promote_idx != -1:
                    predicted_plan_steps[promote_idx]["status"] = "in_progress"
                    predicted_current_index = promote_idx
                    predicted_plan_status = "in_progress"
        # If we predicted changes, persist them before routing or ending
        plan_updates = {}
        if predicted_plan_steps != plan_steps:
            plan_updates["planSteps"] = predicted_plan_steps
        if predicted_current_index != current_step_index:
            plan_updates["currentStepIndex"] = predicted_current_index
        if predicted_plan_status != plan_status:
            plan_updates["planStatus"] = predicted_plan_status
    except Exception:
        plan_updates = {}

    # only route to tool node if tool is not in the tools list
    if route_to_tool_node(response):
        print("routing to tool node")
        return Command(
            goto="tool_node",
            update={
                "messages": [response],
                # persist shared state keys so UI edits survive across runs
                "userContext": state.get("userContext", ""),
                "activeOrganizationId": state.get("activeOrganizationId", ""),
                "activeProjectId": state.get("activeProjectId", ""),
                "activeCycleId": state.get("activeCycleId", ""),
                "currentView": state.get("currentView", ""),
                "lastAction": state.get("lastAction", ""),
                "itemsCreated": state.get("itemsCreated", 0),
                "planSteps": state.get("planSteps", []),
                "currentStepIndex": state.get("currentStepIndex", -1),
                "planStatus": state.get("planStatus", ""),
                **plan_updates,
                # guidance for follow-up after tool execution
                "__last_tool_guidance": "If a deletion tool reports success (deleted:ID), acknowledge deletion even if the item no longer exists afterwards."
            }
        )

    # 5. If there are remaining steps, auto-continue; otherwise end the graph.
    try:
        effective_steps = plan_updates.get("planSteps", plan_steps)
        effective_plan_status = plan_updates.get("planStatus", plan_status)
        has_remaining = bool(effective_steps) and any(
            (s.get("status") not in ("completed", "failed")) for s in effective_steps
        )
    except Exception:
        effective_steps = plan_steps
        effective_plan_status = plan_status
        has_remaining = False

    # Determine if this response contains frontend tool calls that must be delivered to the client
    try:
        tool_calls = getattr(response, "tool_calls", []) or []
    except Exception:
        tool_calls = []
    has_frontend_tool_calls = False
    for tc in tool_calls:
        name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
        if name and name not in backend_tool_names:
            has_frontend_tool_calls = True
            break

    # If the model produced FRONTEND tool calls, deliver them to the client and stop the turn.
    # The client will execute and post ToolMessage(s), after which the next run can resume.
    if has_frontend_tool_calls:
        return Command(
            goto=END,
            update={
                "messages": [response],
                "userContext": state.get("userContext", ""),
                "activeOrganizationId": state.get("activeOrganizationId", ""),
                "activeProjectId": state.get("activeProjectId", ""),
                "activeCycleId": state.get("activeCycleId", ""),
                "currentView": state.get("currentView", ""),
                "lastAction": state.get("lastAction", ""),
                "itemsCreated": state.get("itemsCreated", 0),
                "planSteps": state.get("planSteps", []),
                "currentStepIndex": state.get("currentStepIndex", -1),
                "planStatus": state.get("planStatus", ""),
                **plan_updates,
                "__last_tool_guidance": (
                    "Frontend tool calls issued. Waiting for client tool results before continuing."
                ),
            },
        )

    if has_remaining and effective_plan_status != "completed":
        # Auto-continue; include response only if it carries frontend tool calls
        return Command(
            goto="chat_node",
            update={
                # At this point there should be no frontend tool calls; ensure we don't pass any unresolved ones back to the model
                "messages": ([]),
                # persist shared state keys so UI edits survive across runs
                "userContext": state.get("userContext", ""),
                "activeOrganizationId": state.get("activeOrganizationId", ""),
                "activeProjectId": state.get("activeProjectId", ""),
                "activeCycleId": state.get("activeCycleId", ""),
                "currentView": state.get("currentView", ""),
                "lastAction": state.get("lastAction", ""),
                "itemsCreated": state.get("itemsCreated", 0),
                "planSteps": state.get("planSteps", []),
                "currentStepIndex": state.get("currentStepIndex", -1),
                "planStatus": state.get("planStatus", ""),
                **plan_updates,
                "__last_tool_guidance": (
                    "Plan is in progress. Proceed to the next step automatically. "
                    "Update the step status to in_progress, call necessary tools, and mark it completed when done."
                ),
            }
        )

    # If all steps look completed but planStatus is not yet 'completed', nudge the model to call complete_plan
    try:
        all_steps_completed = bool(effective_steps) and all((s.get("status") == "completed") for s in effective_steps)
        plan_marked_completed = (effective_plan_status == "completed")
    except Exception:
        all_steps_completed = False
        plan_marked_completed = False

    if all_steps_completed and not plan_marked_completed:
        return Command(
            goto="chat_node",
            update={
                "messages": [response] if has_frontend_tool_calls else ([]),
                # persist shared state keys so UI edits survive across runs
                "userContext": state.get("userContext", ""),
                "activeOrganizationId": state.get("activeOrganizationId", ""),
                "activeProjectId": state.get("activeProjectId", ""),
                "activeCycleId": state.get("activeCycleId", ""),
                "currentView": state.get("currentView", ""),
                "lastAction": state.get("lastAction", ""),
                "itemsCreated": state.get("itemsCreated", 0),
                "planSteps": state.get("planSteps", []),
                "currentStepIndex": state.get("currentStepIndex", -1),
                "planStatus": state.get("planStatus", ""),
                **plan_updates,
                "__last_tool_guidance": (
                    "All steps are completed. Call complete_plan to mark the plan as finished, "
                    "then present a concise summary of outcomes."
                ),
            }
        )

    # Only show chat messages when not actively in progress; always deliver frontend tool calls
    currently_in_progress = (plan_updates.get("planStatus", plan_status) == "in_progress")
    final_messages = [response] if (has_frontend_tool_calls or not currently_in_progress) else ([])
    return Command(
        goto=END,
        update={
            "messages": final_messages,
            # persist shared state keys so UI edits survive across runs
            "userContext": state.get("userContext", ""),
            "activeOrganizationId": state.get("activeOrganizationId", ""),
            "activeProjectId": state.get("activeProjectId", ""),
            "activeCycleId": state.get("activeCycleId", ""),
            "currentView": state.get("currentView", ""),
            "lastAction": state.get("lastAction", ""),
            "itemsCreated": state.get("itemsCreated", 0),
            "planSteps": state.get("planSteps", []),
            "currentStepIndex": state.get("currentStepIndex", -1),
            "planStatus": state.get("planStatus", ""),
            **plan_updates,
            "__last_tool_guidance": None,
        }
    )

def route_to_tool_node(response: BaseMessage):
    """
    Route to tool node if any tool call in the response matches a backend tool name.
    """
    tool_calls = getattr(response, "tool_calls", None)
    if not tool_calls:
        return False

    for tool_call in tool_calls:
        name = tool_call.get("name")
        if name in backend_tool_names:
            return True
    return False

# Define the workflow graph
workflow = StateGraph(AgentState)
workflow.add_node("chat_node", chat_node)
workflow.add_node("tool_node", ToolNode(tools=backend_tools))
workflow.add_edge("tool_node", "chat_node")
workflow.set_entry_point("chat_node")

graph = workflow.compile()
