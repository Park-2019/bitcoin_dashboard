"use client";

import { cn } from "@/lib/utils";
import { 
    LayoutDashboard, 
    LineChart, 
    Wallet, 
    ScrollText, 
    Settings,
    History,
    Bot,
    ChevronRight,
    X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    onClose?: () => void;
}

const navItems = [
    { name: "대시보드", href: "/", icon: LayoutDashboard },
    { name: "트레이딩", href: "/trading", icon: LineChart },
    { name: "거래내역", href: "/history", icon: History },
    { name: "포트폴리오", href: "/portfolio", icon: Wallet },
    { name: "로그", href: "/logs", icon: ScrollText },
    { name: "설정", href: "/settings", icon: Settings },
];

export function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <div className="w-56 h-full bg-slate-950 border-r border-slate-800 flex flex-col">
            {/* Logo / Title */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-slate-100 text-sm tracking-wide">
                        퀀트 봇
                    </span>
                </div>
                {onClose && (
                    <button 
                        className="md:hidden p-1 text-slate-400 hover:text-slate-200"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 group",
                                isActive 
                                    ? "bg-green-500/10 text-green-400 border-l-2 border-green-500" 
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 mr-3 transition-colors",
                                isActive ? "text-green-400" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {item.name}
                            {isActive && (
                                <ChevronRight className="w-4 h-4 ml-auto text-green-500" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bot Summary - Bottom */}
            <div className="p-3 border-t border-slate-800">
                <div className="bg-slate-900/50 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                        <span>진행중 거래</span>
                        <span className="text-slate-200 font-medium">4</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>일일 손익</span>
                        <span className="text-green-400 font-medium">+2.34%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>잔고</span>
                        <span className="text-slate-200 font-medium">$10,234</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
