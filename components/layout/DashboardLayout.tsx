"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { StatusIndicator } from "./StatusIndicator";
import { Menu } from "lucide-react";
import { OKXStatus } from "@/lib/api";

interface DashboardLayoutProps {
    children: ReactNode;
    onStatusChange?: (status: OKXStatus | null) => void;
}

export function DashboardLayout({ children, onStatusChange }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Responsive (hidden on mobile, shown on desktop) */}
            <div className={`
                fixed lg:fixed inset-y-0 left-0 z-50 
                transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:translate-x-0 transition-transform duration-200 ease-in-out
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main Content Area (offset on desktop for sidebar) */}
            <div className="lg:ml-56 min-h-screen flex flex-col">
                {/* Top Status Bar */}
                <div className="sticky top-0 z-30 flex items-center border-b border-slate-800 bg-slate-950">
                    {/* Mobile Menu Button */}
                    <button 
                        className="lg:hidden p-2 text-slate-400 hover:text-slate-200 flex-shrink-0"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <StatusIndicator onStatusChange={onStatusChange} />
                    </div>
                </div>

                {/* Scrollable Content */}
                <main className="flex-1 p-3 bg-slate-900/30">
                    {children}
                </main>
            </div>
        </div>
    );
}
