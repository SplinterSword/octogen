"use server"

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEncoding } from "js-tiktoken";

const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

const encoder = getEncoding("cl100k_base");

function filterFiles(diff: string): string {
    const ignorePatterns = [
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "dist/",
        "build/",
        "node_modules/",
        ".next/",
    ];

    const lines = diff.split("\n");

    let keep = true;
    let filtered: string[] = [];

    for (const line of lines) {
        if (line.startsWith("diff --git")) {
            keep = !ignorePatterns.some(pattern =>
                line.includes(pattern)
            );
        }

        if (keep) {
            filtered.push(line);
        }
    }

    return filtered.join("\n");
}

function countTokens(text: string): number {
    return encoder.encode(text).length;
}

export const aiSummariseCommit = async (diff: string) => {
    const filteredFileDiff = filterFiles(diff);

    const filteredDiff = filteredFileDiff
        .split("\n")
        .filter(line => line.startsWith("+") || line.startsWith("-"))
        .join("\n");

    const tokenCount = countTokens(filteredDiff);

    const SYSTEM_PROMPT = `Summarize a git diff into concise bullet points.

Rules:
- + added, - removed
- Ignore context
- Focus on what changed and why (if clear)

Output:
- Use * bullets
- Add file names in [brackets] if useful
- Keep it short`;

    // ✅ FAST PATH
    if (tokenCount <= 6000) {
        const response = await generateText({
            model: groq("openai/gpt-oss-120b"),
            system: SYSTEM_PROMPT,
            prompt: filteredDiff,
        });

        return response.text;
    }

    // 🔥 CHUNKING PATH
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(filteredDiff);

    const partialSummaries = await Promise.all(
        chunks.map(chunk =>
            generateText({
                model: groq("openai/gpt-oss-120b"),
                system: SYSTEM_PROMPT,
                prompt: chunk,
            }).then(res => res.text)
        )
    );

    // 🧠 FINAL MERGE
    const final = await generateText({
        model: groq("openai/gpt-oss-120b"),
        system: `Combine multiple git diff summaries into one clean final summary using bullet points.`,
        prompt: partialSummaries.join("\n"),
    });

    return final.text;
};