'use client'

import { Button } from "@/components/ui/button"
import { api } from "@/trpc/react"
import { useProjects } from "@/hooks/use-projects"
import useRefetch from "@/hooks/use-refetch"
import { toast } from "sonner"

export function ArchiveButton() {
    const archiveProject = api.project.archiveProject.useMutation()
    const { projectId } = useProjects()
    const refetch = useRefetch()
    
    return (
        <Button disabled={!projectId || archiveProject.isPending} size='sm' variant='destructive' onClick={() => {
            const confirm = window.confirm("Are you sure you want to archive this project?")
            if (confirm && projectId) {
                archiveProject.mutate({ projectId }, {
                    onSuccess: () => {
                        toast.success("Project archived")
                        refetch()
                    },
                    onError: (error) => {
                        toast.error(`Failed to archive project: ${error.message}`)
                    }
                })
            }
        }}>
            Archive
        </Button>
    )
}
