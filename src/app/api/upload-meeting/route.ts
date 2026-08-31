import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/server/db"
import { uploadFileToAssemblyAI } from "@/lib/assembly"

export const config = {
    api: { bodyParser: { sizeLimit: "50mb" } }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) return new Response("Unauthorized", { status: 401 })

        const formData = await req.formData()
        const file = formData.get("file") as File
        const projectId = formData.get("projectId") as string
        const name = formData.get("name") as string

        if (!file || !projectId) {
            return new Response("Missing required fields", { status: 400 })
        }

        // Upload file directly to AssemblyAI storage
        const meetingUrl = await uploadFileToAssemblyAI(file)

        // Create meeting record
        const meeting = await db.meeting.create({
            data: {
                name,
                meetingUrl,
                projectId,
                status: "PROCESSING"
            }
        })

        return NextResponse.json({ meeting, meetingUrl }, { status: 201 })
    } catch (error) {
        console.error("Upload error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}