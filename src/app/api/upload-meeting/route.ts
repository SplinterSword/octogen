import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/server/db"
import { z } from "zod"

const requestBody = z.object({
    uploadUrl: z.string().url(),
    projectId: z.string(),
    name: z.string(),
})

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) return new Response("Unauthorized", { status: 401 })

        const body = await req.json()
        const { uploadUrl, projectId, name } = requestBody.parse(body)

        if (!uploadUrl || !projectId) {
            return new Response("Missing required fields", { status: 400 })
        }

        // Create meeting record with AssemblyAI upload URL
        const meeting = await db.meeting.create({
            data: {
                name,
                meetingUrl: uploadUrl,
                projectId,
                status: "PROCESSING"
            }
        })

        return NextResponse.json({ meeting, meetingUrl: uploadUrl }, { status: 201 })
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}