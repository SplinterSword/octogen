'use client'

import { Button } from "@/components/ui/button"
import { api } from "@/trpc/react"
import { useProjects } from "@/hooks/use-projects"
import useRefetch from "@/hooks/use-refetch"
import { toast } from "sonner"
import { useEffect, useState } from "react"

export function ArchiveButton() {
    const archiveProject = api.project.archiveProject.useMutation()
    const { projectId } = useProjects()
    const refetch = useRefetch()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return null

    return (
        <Button disabled={!projectId || archiveProject.isPending} size='sm' variant='destructive' onClick={() => {
            const confirm = window.confirm("Are you sure you want to delete this project?")
            if (confirm && projectId) {
                archiveProject.mutate({ projectId }, {
                    onSuccess: () => {
                        toast.success("Project deleted")
                        refetch()
                    },
                    onError: (error) => {
                        toast.error(`Failed to delete project: ${error.message}`)
                    }
                })
            }
        }}>
            Delete
        </Button>
    )
}
