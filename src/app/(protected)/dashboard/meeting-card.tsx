'use client'

import { Card } from "@/components/ui/card"
import { uploadFile } from "@/lib/firebase"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Presentation, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"

export default function MeetingCard() {
    const [progress, setProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.flac']
        },
        multiple: false,
        maxSize: 50_000_000,
        onDrop: async (acceptedFiles) => {
            console.log(acceptedFiles)
            const file = acceptedFiles[0]
            setIsUploading(true)
            const downloadURL = await uploadFile(file as File, setProgress)
            window.alert(downloadURL)
            setIsUploading(false)
        }
    })

    return (
        <Card className="col-span-2 flex flex-col items-center justify-center p-10" {...getRootProps()}>
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
                        <Button disabled={isUploading}>
                            <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                            Upload Meeting
                            <input {...getInputProps()} className="hidden" />
                        </Button>
                    </div>
                </>
            ) : (
                <div>
                    <CircularProgressbar value={progress} text={`${progress}%`} styles={
                        buildStyles({
                            pathColor: "oklch(0.511 0.096 186.391)",
                            textColor: "oklch(0.511 0.096 186.391)"
                        })
                    }/>
                    <p className="text-sm text-gray-500 text-center">Uploading your meeting...</p>
                </div>
            )}
        </Card>
    )
}