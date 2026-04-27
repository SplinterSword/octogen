"use server"

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText, embed } from "ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { countTokens, extractMeaningfulDiff } from "./commit-helpers";
import { Document } from '@langchain/core/documents'

const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export const aiSummariseCommit = async (diff: string) => {
    let filteredDiff = extractMeaningfulDiff(diff);

    if (!filteredDiff.trim()) {
        return "No meaningful changes to summarize.";
    }

    console.log("filtered diff length:", filteredDiff.length);

    const tokenCount = countTokens(filteredDiff);

    console.log("token count:", tokenCount);

    const SYSTEM_PROMPT = `Summarize a git diff into concise bullet points.

Rules:
- + added, - removed
- Ignore context lines
- Focus on what changed and why (if clear)

Output:
- Use * bullets
- Add file names in [brackets] if useful
- Keep it short`;

    while (countTokens(filteredDiff) > 1500) {
        filteredDiff = filteredDiff.slice(0, -1);
    }

    // ✅ FAST PATH
    if (countTokens(filteredDiff) <= 2000) {
        console.log("FAST PATH");
        try {
            const response = await generateText({
                model: groq("openai/gpt-oss-120b"),
                system: SYSTEM_PROMPT,
                prompt: filteredDiff,
            });

            return response.text;
        }
        catch (error) {
            console.error("Error generating text:", error);
            return "Error generating summary.";
        }
    }
    else {
        // 🔥 CHUNKING PATH (rare)
        console.log("CHUNKING PATH");
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 7000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.splitText(filteredDiff);

        console.log("Chunks count:", chunks.length);

        const partialSummaries: string[] = [];

        for (const chunk of chunks) {
            const response = await generateText({
                model: groq("openai/gpt-oss-120b"),
                system: SYSTEM_PROMPT,
                prompt: chunk,
            });

            partialSummaries.push(response.text);
        }

        // 🧠 FINAL MERGE
        console.log("FINAL MERGE");
        const final = await generateText({
            model: groq("openai/gpt-oss-120b"),
            system: `Combine multiple git diff summaries into one clean final summary using bullet points.`,
            prompt: partialSummaries.join("\n"),
        });

        return final.text;
    }
};

export async function summarizeCode(doc: Document) {
    console.log("getting summary for", doc.metadata.source);

    try {
        const code = doc.pageContent.slice(0, 10000);
        const response = await generateText({
            model: groq("openai/gpt-oss-120b"),
            system: `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects`,
            prompt: `You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file
Here is the code:
---
${code}
---

Give a summary no more than 100 words of the code above
`
        })
        return response.text
    } catch (error) {
        console.error(`Error generating summary for ${doc.metadata.source}:`, error);
        return "Error generating summary.";
    }

}


export async function generateEmbedding(summary: string) {
    try {
        const result = await embed({
            model: google.embedding("gemini-embedding-001"),
            value: summary,
        });
        return result.embedding;
    } catch (error) {
        console.error(`Error generating embeddings for summary:`, error);
        return "Error generating embeddings.";
    }
}