"use client"

import { useProjects } from "@/hooks/use-projects"
import { ExternalLink, GitBranch } from "lucide-react"
import Link from "next/link"
import CommitLog from "./commit-log"
import AskQuestionCard from "./ask-question-card"
import MeetingCard from "./meeting-card"
import { ArchiveButton } from "./archive-button"
import { TeamMembers } from "./team-members"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"

const InviteButton = dynamic(() => import("./invite-button").then(mod => mod.InviteButton), {
    ssr: false
})

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function DashboardPage() {
    const { project } = useProjects()
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex items-center justify-between flex-wrap gap-y-4">
                {/* github link */}
                <motion.div variants={itemVariants} className="w-fit rounded-md bg-primary px-4 py-2 shadow-sm">
                    <div className="flex items-center">
                        <GitBranch className="size-6 text-white" />
                        <div className="ml-2">
                            <p className="text-sm font-medium text-white">
                                This project is linked to {' '}
                                <Link href={project?.githubUrl || ""} className="inline-flex items-center text-white/80 hover:underline">
                                    {project?.githubUrl}
                                    <ExternalLink className="ml-1 size-4" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </motion.div>

                <div className="h-4"></div>

                <motion.div variants={itemVariants} className="flex items-center gap-4">
                    <TeamMembers />
                    <InviteButton />
                    <ArchiveButton />
                </motion.div>
            </div>

            <div className="mt-4">
                <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-5 h-fit">
                    <AskQuestionCard />
                    <MeetingCard />
                </motion.div>
            </div>

            <div className="mt-8"></div>
            <motion.div variants={itemVariants}>
                <CommitLog />
            </motion.div>
        </motion.div>
    )
}
