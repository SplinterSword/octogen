"use server"

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export const aiSummariseCommit = async (diff: string) => {
    const filteredDiff = diff
        .split("\n")
        .filter(line => line.startsWith("+") || line.startsWith("-"))
        .join("\n");


    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(filteredDiff);

    const partialSummaries = await Promise.all(
        chunks.map(chunk =>
            generateText({
                model: groq("openai/gpt-oss-120b"),
                prompt: `Summarize git diff chunk:

Rules:
- + added, - removed
- Be concise
- Output bullet points

${chunk}`
            }).then(res => res.text)
        )
    );

    const final = await generateText({
        model: groq("openai/gpt-oss-120b"),
        prompt: `Combine into a clean final summary:

${partialSummaries.join("\n")}`
    });

    return final.text;
}