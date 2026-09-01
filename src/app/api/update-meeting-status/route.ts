import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/server/db"
import { z } from "zod"

const requestBody = z.object({
    meetingId: z.string(),
    status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]),
})

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) return new Response("Unauthorized", { status: 401 })

        const body = await req.json()
        const { meetingId, status } = requestBody.parse(body)

        await db.meeting.update({
            where: { id: meetingId },
            data: { status },
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error("Update meeting status error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
