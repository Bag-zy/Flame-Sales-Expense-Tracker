'use client';

import * as React from "react";

type AssistantContextType = {
    isAssistantOpen: boolean;
    setAssistantOpen: (open: boolean) => void;
    toggleAssistant: () => void;
};

const AssistantContext = React.createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
    const [isAssistantOpen, setIsAssistantOpen] = React.useState(true);

    const toggleAssistant = () => setIsAssistantOpen((prev) => !prev);

    return (
        <AssistantContext.Provider value={{ isAssistantOpen, setAssistantOpen: setIsAssistantOpen, toggleAssistant }}>
            {children}
        </AssistantContext.Provider>
    );
}

export function useAssistant() {
    const context = React.useContext(AssistantContext);
    if (context === undefined) {
        throw new Error("useAssistant must be used within an AssistantProvider");
    }
    return context;
}
