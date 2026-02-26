import {
    CopilotRuntime,
    ExperimentalEmptyAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new ExperimentalEmptyAdapter();

// 2. Create the CopilotRuntime instance and utilize the LangGraph plugin.
const runtime = new CopilotRuntime({
    agents: {
        "flame_assistant": new LangGraphAgent({
            deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
            graphId: "flame_assistant",
            langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
        }) as any,
    }
});

// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
const handler = async (req: NextRequest) => {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: "/api/v1/copilotkit",
    });

    return handleRequest(req);
};

export const POST = handler;
export const GET = handler;
