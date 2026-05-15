'use client'

import { LayoutDashboard, Bot, Presentation } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useProjects } from "@/hooks/use-projects"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState, useEffect } from "react"

export function ProjectNav() {
    const pathname = usePathname()
    const { projectId } = useProjects()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const items = [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Q&A",
            url: "/qa",
            icon: Bot,
        },
        {
            title: "Meetings",
            url: "/meetings",
            icon: Presentation,
        }
    ]

    if (!isMounted || !projectId) return null;

    return (
        <TooltipProvider delayDuration={100}>
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-2 px-3 py-2 bg-background/80 backdrop-blur-lg border shadow-2xl rounded-full">
                    {items.map((item) => {
                        const isActive = pathname === item.url
                        return (
                            <Tooltip key={item.title}>
                                <TooltipTrigger asChild>
                                    <Link href={item.url}>
                                        <div
                                            className={cn(
                                                "flex items-center justify-center p-3 rounded-full transition-all duration-200 hover:bg-muted",
                                                isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            {/* Optional: Add text if active */}
                                            {/* {isActive && <span className="ml-2 text-sm font-medium pr-1">{item.title}</span>} */}
                                        </div>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={10}>
                                    <p>{item.title}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
            </div>
        </TooltipProvider>
    )
}
