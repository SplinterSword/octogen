'use client'

import { Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenuItem, SidebarMenuButton, SidebarMenu } from "@/components/ui/sidebar"
import { CreditCard, Plus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useProjects } from "@/hooks/use-projects"
import { motion } from "framer-motion"

const items = [
    {
        title: "Billing",
        url: "/billing",
        icon: CreditCard,
    }
]
import { OctogenLogo } from "@/components/octogen-logo"

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { open } = useSidebar()
    const { projects, projectId, setProjectId } = useProjects()

    const listVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    }

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <OctogenLogo className="w-8 h-8" />
                    </motion.div>
                    {open && (
                        <motion.h1 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xl font-bold text-primary/80"
                        >
                            Octogen
                        </motion.h1>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Application
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <motion.div initial="hidden" animate="visible" variants={listVariants}>
                            <SidebarMenu>
                                {items.map((item) => (
                                    <motion.div key={item.title} variants={itemVariants}>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild>
                                                <Link href={item.url} className={cn({ "!bg-primary !text-white": pathname === item.url }, 'list-none transition-colors')}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </motion.div>
                                ))}
                            </SidebarMenu>
                        </motion.div>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>
                        Your Projects
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <motion.div initial="hidden" animate="visible" variants={listVariants}>
                            <SidebarMenu>
                                {projects?.map((project: any) => (
                                    <motion.div key={project.name} variants={itemVariants}>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild>
                                                <div onClick={() => {
                                                    setProjectId(project.id)
                                                    router.push('/dashboard')
                                                }} className="cursor-pointer transition-colors">
                                                    <div className={cn("rounded-sm border size-6 flex items-center justify-center text-sm bg-muted text-primary transition-colors",
                                                        {
                                                            'border-primary bg-primary text-white': projectId === project.id
                                                        }
                                                    )}>
                                                        {project.name[0]}
                                                    </div>
                                                    <span>{project.name}</span>
                                                </div>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </motion.div>
                                ))}
                                <div className="h-2"></div>
                                {open && (
                                    <motion.div variants={itemVariants}>
                                        <SidebarMenuItem>
                                            <Link href="/create">
                                                <Button size="sm" variant="outline" className="w-fit transition-transform active:scale-95">
                                                    <Plus />
                                                    Create Project
                                                </Button>
                                            </Link>
                                        </SidebarMenuItem>
                                    </motion.div>
                                )}
                            </SidebarMenu>
                        </motion.div>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}