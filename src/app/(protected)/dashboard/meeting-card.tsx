"use client"

import { Card } from "@/components/ui/card"
import { useProjects } from "@/hooks/use-projects"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Presentation, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import useRefetch from "@/hooks/use-refetch"
import { toast } from "sonner"
import { motion } from "framer-motion"

export default function MeetingCard() {
    const { project } = useProjects()
    const refetch = useRefetch()

    const processMeeting = useMutation({
        mutationFn: async (data: { meetingUrl: string, meetingId: string, projectId: string }) => {
            const response = await fetch("/api/process-meeting", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    meetingUrl: data.meetingUrl,
                    meetingId: data.meetingId,
                    projectId: data.projectId,
                }),
            })
            if (!response.ok) {
                const text = await response.text()
                let data: any
                try { data = JSON.parse(text) } catch { data = { message: text } }
                throw new Error(data.message || "Failed to process meeting")
            }
            const text = await response.text()
            return JSON.parse(text)
        },
        onError: async (error, variables) => {
            console.error("Meeting processing failed:", error)
            await fetch("/api/update-meeting-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ meetingId: variables.meetingId, status: "FAILED" }),
            })
        },
    })
    const [isUploading, setIsUploading] = useState(false)
    const router = useRouter()

    const onDropHandler = async (acceptedFiles: File[]) => {
        if (!project) return
        const file = acceptedFiles[0]
        if (!file) return
        setIsUploading(true)
        try {
            // Upload file directly to AssemblyAI from client
            const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
                method: "POST",
                headers: {
                    "authorization": process.env.NEXT_PUBLIC_ASSEMBLY_AI_API_KEY!,
                    "Content-Type": "application/octet-stream",
                },
                body: file,
            })

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text()
                throw new Error(`AssemblyAI upload failed: ${errorText}`)
            }

            const { upload_url } = await uploadResponse.json()

            // Create meeting record with upload URL
            const response = await fetch("/api/upload-meeting", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uploadUrl: upload_url,
                    projectId: project?.id,
                    name: file.name,
                }),
            })
            const responseText = await response.text()
            let result: any
            try { result = JSON.parse(responseText) } catch { result = { message: responseText } }

            if (!response.ok) throw new Error(result.message || "Failed to create meeting record")

            setIsUploading(false)
            toast.success("Meeting uploaded successfully")
            refetch()

            try {
                await processMeeting.mutateAsync({
                    meetingUrl: result.meetingUrl,
                    meetingId: result.meeting.id,
                    projectId: project?.id,
                })
                toast.success("Meeting processed successfully")
                router.push(`/meetings`)
            } catch (processError) {
                console.error("Processing error:", processError)
                toast.error("Meeting uploaded but processing failed", {
                    description: "The meeting was saved but transcription failed. Check the meetings page for status."
                })
                router.push(`/meetings`)
            }
        } catch (error: any) {
            console.error("Upload error:", error)
            toast.error("Failed to upload meeting", {
                description: error?.message
            })
        } finally {
            setIsUploading(false)
        }
    }

    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.flac']
        },
        multiple: false,
        maxSize: 50_000_000,
        noClick: false,
        noKeyboard: true,
        noDrag: false,
        onDrop: onDropHandler,
    })

    return (
        <motion.div className="col-span-2" whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card
                className="flex flex-col items-center justify-center p-10 h-full transition-shadow hover:shadow-xl cursor-pointer"
                {...getRootProps()}
            >
                <input {...getInputProps()} />
                {!isUploading ? (
                    <>
                        <Presentation className="h-10 w-10 animate-bounce" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                            Create a new meeting
                        </h3>
                        <p className="mt-1 text-center text-sm text-gray-500">
                            Analyse your meeting with Octogen
                            <br/>
                            Powered By Assembly AI
                        </p>
                        <div className="mt-6">
                            <Button
                                disabled={isUploading}
                            >
                                <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                Upload Meeting
                            </Button>
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="text-sm text-gray-500 text-center">Uploading your meeting...</p>
                    </div>
                )}
            </Card>
        </motion.div>
    )
}
