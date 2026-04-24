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

function shouldIgnoreFile(line: string, ignorePatterns: string[]): boolean {
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (!match) return false;

    const [, fileA, fileB] = match;

    return ignorePatterns.some(pattern => {
        // folder match
        if (pattern.endsWith("/")) {
            return fileA?.includes(pattern) || fileB?.includes(pattern);
        }

        // exact file match (strict)
        const regex = new RegExp(pattern.replace(".", "\\.") + "$");
        return regex.test(fileA!) || regex.test(fileB!);
    });
}

function extractMeaningfulDiff(diff: string): string {
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

    const result: string[] = [];
    let keepFile = true;

    for (const line of lines) {
        // 🔹 Detect new file block
        if (line.startsWith("diff --git")) {
            keepFile = !shouldIgnoreFile(line, ignorePatterns);

            if (keepFile) {
                result.push(line);
            }
            continue;
        }

        if (!keepFile) continue;

        if (
            line.startsWith("index") ||
            line.startsWith("---") ||
            line.startsWith("+++") ||
            line.startsWith("@@") ||
            line.startsWith("+") ||
            line.startsWith("-")
        ) {
            result.push(line);
        }
    }

    return result.join("\n");
}

function countTokens(text: string): number {
    return encoder.encode(text).length;
}

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
