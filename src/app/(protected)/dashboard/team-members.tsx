'use client'

import { useProjects } from "@/hooks/use-projects"
import { api } from "@/trpc/react"

export function TeamMembers() {
    const { project } = useProjects()
    const { data: members } = api.project.getTeamMembers.useQuery({ projectId: project?.id || "" })

    return (
        <div className="flex items-center gap-2">
            {members?.map((member) => (
                <img key={member.id} src={member.user.imageUrl || ""} alt={member.user.firstName || ""} height={30} width={30} className="rounded-full" />
            ))}
        </div>
    )
}