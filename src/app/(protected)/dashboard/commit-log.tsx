'use client'

import { useProjects } from "@/hooks/use-projects"
import { cn } from "@/lib/utils"
import { api } from "@/trpc/react"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

const CommitLog = () => {
    const { projectId, project } = useProjects()
    const { data: commits } = api.project.getCommits.useQuery({ projectId: projectId! })

    return (
        <>
            <motion.ul variants={listVariants} initial="hidden" animate="visible" className="space-y-8">
                {commits?.map((commit, commitIdx) => (
                    <motion.li variants={itemVariants} key={commit.id} className="relative flex gap-x-4 group">
                        <div className={cn(commitIdx === commits.length - 1 ? "h-6" : "-bottom-6", 'absolute left-0 top-0 flex w-6 justify-center')}>
                            <div className="w-px translate-x-1 bg-gray-200"></div>
                        </div>

                        <>
                            <img src={commit.commitAuthorAvatar} alt="commit avatar" className="relative mt-4 size-8 rounded-full bg-gray-50 ring-2 ring-transparent group-hover:ring-primary/30 transition-all" />
                            <div className="flex-auto rounded-mg bg-white p-3 ring-1 ring-inset ring-gray-200 transition-shadow group-hover:shadow-md">
                                <div className="flex justify-between gap-x-4">
                                    <Link target="_blank" href={`${project?.githubUrl}/commits/${commit.commitHash}`} className="py-0.5 text-xs leading-5 text-gray-500 hover:text-gray-700">
                                        <span className="font-medium text-gray-900">
                                            {commit.commitAuthorName}
                                        </span>{" "}
                                        <span className="inline-flex items-center">
                                            commited
                                            <ExternalLink className="ml-1 size-4" />
                                        </span>
                                    </Link>
                                </div>
                                <span className="font-semibold">
                                    {commit.commitMessage}
                                </span>
                                <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-500">
                                    {commit.summary}
                                </pre>
                            </div>
                        </>
                    </motion.li>
                ))}
            </motion.ul>
        </>
    )
}

export default CommitLog