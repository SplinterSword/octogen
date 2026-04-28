"use client"

import { useProjects } from "@/hooks/use-projects"
import { ExternalLink, GitBranch } from "lucide-react"
import Link from "next/link"
import CommitLog from "./commit-log"
import AskQuestionCard from "./ask-question-card"
import MeetingCard from "./meeting-card"

export default function DashboardPage() {
    const { project } = useProjects()
    return (
        <div>
            <div className="flex items-center justify-between flex-wrap gap-y-4">
                {/* github link */}
                <div className="w-fit rounded-md bg-primary px-4 py-2">
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
                </div>

                <div className="h-4"></div>

                <div className="flex items-center gap-4">
                    TeamMembers
                    InviteButton
                    ArchiveButton
                </div>
            </div>

            <div className="mt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 h-fit">
                    <AskQuestionCard />
                    <MeetingCard />
                </div>
            </div>

            <div className="mt-8"></div>
            <CommitLog />
        </div>
    )
}
