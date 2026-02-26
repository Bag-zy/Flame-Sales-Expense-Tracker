'use client';

import { CopilotChat } from "@copilotkit/react-ui";
import { Bot, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/lib/context/assistant-context";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 280;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 360;
const DRAG_THRESHOLD = 4; // px movement before treating as a drag vs a click
const WIDTH_KEY = "assistant-sidebar-width";
const COLLAPSED_KEY = "assistant-sidebar-collapsed";

export function AssistantSidebar() {
    const { isAssistantOpen, setAssistantOpen } = useAssistant();

    const [width, setWidth] = useState<number>(() => {
        if (typeof window === "undefined") return DEFAULT_WIDTH;
        const saved = localStorage.getItem(WIDTH_KEY);
        return saved ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(saved))) : DEFAULT_WIDTH;
    });

    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(COLLAPSED_KEY) === "true";
    });

    const isDragging = useRef(false);
    const hasDragged = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(width);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = Math.abs(e.clientX - startX.current);
        if (delta > DRAG_THRESHOLD) hasDragged.current = true;

        if (hasDragged.current) {
            const newWidth = Math.min(
                MAX_WIDTH,
                Math.max(MIN_WIDTH, startWidth.current + (startX.current - e.clientX))
            );
            setWidth(newWidth);
            if (isCollapsed) setIsCollapsed(false);
        }
    }, [isCollapsed]);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;

        // It was a click (no real drag movement) → toggle collapsed
        if (!hasDragged.current) {
            setIsCollapsed((prev) => {
                const next = !prev;
                localStorage.setItem(COLLAPSED_KEY, String(next));
                return next;
            });
        } else {
            localStorage.setItem(WIDTH_KEY, String(startWidth.current));
        }

        isDragging.current = false;
        hasDragged.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
    }, [onMouseMove]);

    const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        hasDragged.current = false;
        startX.current = e.clientX;
        startWidth.current = width;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, [width, onMouseMove, onMouseUp]);

    // Persist width
    useEffect(() => {
        localStorage.setItem(WIDTH_KEY, String(width));
    }, [width]);

    if (!isAssistantOpen) return null;

    // ── Collapsed strip ──────────────────────────────────────────────────────
    if (isCollapsed) {
        return (
            <div
                className={cn(
                    "border-l bg-background flex flex-col items-center h-full shrink-0",
                    "w-8 cursor-pointer group transition-colors hover:bg-muted/50"
                )}
                onClick={() => {
                    setIsCollapsed(false);
                    localStorage.setItem(COLLAPSED_KEY, "false");
                }}
                title="Expand assistant"
            >
                {/* Top: chevron */}
                <div className="pt-3 flex flex-col items-center gap-2">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {/* Middle: rotated label */}
                <div className="flex-1 flex items-center justify-center">
                    <span
                        className="text-[10px] font-semibold tracking-widest text-muted-foreground group-hover:text-primary transition-colors select-none"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                        ASSISTANT
                    </span>
                </div>
                {/* Bottom: bot icon */}
                <div className="pb-3">
                    <Bot className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </div>
        );
    }

    // ── Expanded panel ───────────────────────────────────────────────────────
    return (
        <div
            className="border-l bg-background flex flex-col h-full shrink-0 relative"
            style={{ width }}
        >
            {/* Drag / toggle handle */}
            <div
                onMouseDown={onHandleMouseDown}
                className={cn(
                    "absolute left-0 top-0 h-full w-1.5 z-10 cursor-ew-resize group",
                    "hover:bg-primary/30 active:bg-primary/50 transition-colors duration-150"
                )}
                title="Drag to resize · Click to collapse"
            >
                {/* chevron hint on hover */}
                <ChevronRight className={cn(
                    "absolute top-1/2 -translate-y-1/2 -left-2.5 h-4 w-4",
                    "text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                )} />
            </div>

            {/* Header */}
            <div className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-sm">Flame Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Collapse button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Collapse"
                        onClick={() => {
                            setIsCollapsed(true);
                            localStorage.setItem(COLLAPSED_KEY, "true");
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {/* Close button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Close assistant"
                        onClick={() => setAssistantOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-hidden relative">
                <CopilotChat
                    labels={{
                        title: "Flame Assistant",
                        initial: "Hi! I'm Flame, your intelligent sales, expense, and inventory assistant. How can I help you today?",
                    }}
                    suggestions={[
                        { title: "Add an Expense", message: "I want to add an expense" },
                        { title: "Record a Sale", message: "I want to record a sale" },
                        { title: "Create an Invoice", message: "I want to create an invoice" },
                        { title: "Add a Customer", message: "I want to add a customer" },
                        { title: "Add Inventory", message: "I want to add inventory" },
                    ]}
                    className="h-full"
                />
            </div>
        </div>
    );
}
