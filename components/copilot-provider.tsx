'use client';

import { usePathname } from "next/navigation";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export function CopilotProvider({ children }: { children: React.ReactNode }) {
    // We point the CopilotKit runtime to our internal Next.js API route that proxies to Python LangGraph
    return (
        <CopilotKit runtimeUrl="/api/v1/copilotkit" agent="flame_assistant">
            {children}
        </CopilotKit>
    );
}
