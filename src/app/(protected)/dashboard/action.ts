'use server'

import { gemini, generateEmbedding, groq } from "@/lib/ai-providers"
import { db } from "@/server/db"
import { streamText } from "ai"
import { createStreamableValue } from "@ai-sdk/rsc"


export async function askQuestion(question: string, projectId: string) {
    const stream = createStreamableValue()
    const queryVector = await generateEmbedding(question)
    const vectorQuery = `[${queryVector.join(',')}]`

    const result = await db.$queryRaw`
        SELECT "fileName", "sourceCode", "summary",
        1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
        FROM "SourceCode"
        WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
        AND "projectId" = ${projectId}
        ORDER BY similarity DESC
            LIMIT 10
    ` as { fileName: string, sourceCode: string, summary: string, similarity: number }[]


    let context = ""
    for (const doc of result) {
        context += `source: ${doc.fileName}\n`
        context += `summary: ${doc.summary}\n`
        context += `code content:\n${doc.sourceCode}\n\n`
    }

    const ragPrompt = `
You are a helpful coding assistant. Answer the user's question using the provided code context.

Context:
${context}

Question:
${question}
`;

    (async () => {
        const { textStream } = await streamText({
            model: gemini('gemini-2.5-flash'),
            prompt: ragPrompt,
        })

        for await (const delta of textStream) {
            stream.update(delta)
        }

        stream.done()
    })()

    return {
        output: stream.value,
        filesReferences: result
    }
}
