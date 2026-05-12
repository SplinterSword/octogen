'use client'

import { useProjects } from "@/hooks/use-projects"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function InviteButton() {
    const { projectId } = useProjects()
    const [open, setOpen] = useState(false)
    const [origin, setOrigin] = useState('')

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        Ask them to copy and paste this link to join your project.
                    </p>
                    <Input
                        className="mt-4"
                        readOnly
                        onClick={() => {
                            navigator.clipboard.writeText(`${origin}/join/${projectId}`)
                            toast.success("Copied to clipboard!")
                        }}
                        value={`${origin}/join/${projectId}`}
                    />
                </DialogContent>
            </Dialog>
            <Button size='sm' onClick={() => setOpen(true)}>Invite Members</Button>
        </>
    )
}