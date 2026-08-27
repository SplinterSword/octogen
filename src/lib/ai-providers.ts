"use server"

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText, embed } from "ai";
import { countTokens, extractMeaningfulDiff, truncateToTokenLimit } from "./commit-helpers";
import { Document } from '@langchain/core/documents'

export const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Select the best model based on token count.
 * Small diffs → fast 8B model (lowest TPM usage)
 * Medium diffs → current 120B model (good quality)
 * Large diffs → Gemini Flash (1M context window, separate TPM pool)
 */
function selectModel(tokenCount: number) {
    if (tokenCount <= 1500) {
        return { model: groq("openai/gpt-oss-20b"), name: "groq-llama-8b" };
    }
    if (tokenCount <= 6000) {
        return { model: groq("openai/gpt-oss-120b"), name: "groq-gpt-oss-120b" };
    }
    return { model: gemini("gemini-2.5-flash"), name: "gemini-flash" };
}

/**
 * Generate text with automatic fallback on rate-limit (429) errors.
 * Falls back from the selected model → Gemini Flash.
 */
async function generateWithFallback(
    tokenCount: number,
    system: string,
    prompt: string,
): Promise<string> {
    const primary = selectModel(tokenCount);
    const fallback = { model: gemini("gemini-2.5-flash"), name: "gemini-flash-fallback" };

    // Deduplicate: if primary is already Gemini Flash, only try once
    const chain = primary.name.startsWith("gemini")
        ? [primary]
        : [primary, fallback];

    for (const { model, name } of chain) {
        try {
            console.log(`Trying model: ${name} (${tokenCount} tokens)`);
            const response = await generateText({ model, system, prompt });
            return response.text;
        } catch (error: any) {
            console.warn(`Error on model ${name}:`, error?.message || error);
            // Fallback if this is not the last model in the chain
            if (name !== fallback.name && chain.length > 1) {
                console.warn(`Attempting fallback to ${fallback.name}...`);
                continue;
            }
            throw error;
        }
    }

    throw new Error("All models in the chain failed to generate text.");
}

const COMMIT_SYSTEM_PROMPT = `Summarize a git diff into concise bullet points.

Rules:
- + added, - removed
- Ignore context lines
- Focus on what changed and why (if clear)

Output:
- Use * bullets
- Add file names in [brackets] if useful
- Keep it short`;

export const aiSummariseCommit = async (diff: string) => {
    let filteredDiff = extractMeaningfulDiff(diff);

    if (!filteredDiff.trim()) {
        return "No meaningful changes to summarize.";
    }

    // Safety cap for extreme diffs (>30K tokens).
    // With Gemini Flash's 1M context, this is rarely hit.
    const MAX_TOKENS = 30000;
    filteredDiff = truncateToTokenLimit(filteredDiff, MAX_TOKENS);

    const tokenCount = countTokens(filteredDiff);
    console.log(`Diff: ${filteredDiff.length} chars, ${tokenCount} tokens`);

    return generateWithFallback(tokenCount, COMMIT_SYSTEM_PROMPT, filteredDiff);
};

export async function summarizeCode(doc: Document) {
    console.log("getting summary for", doc.metadata.source);

    try {
        // Token-based truncation instead of arbitrary character slice
        const MAX_CODE_TOKENS = 15000;
        const code = truncateToTokenLimit(doc.pageContent, MAX_CODE_TOKENS);
        const tokenCount = countTokens(code);

        console.log(`Code summary: ${doc.metadata.source} (${tokenCount} tokens)`);

        const system = `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects`;
        const prompt = `You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file
Here is the code:
---
${code}
---

Give a summary no more than 100 words of the code above
`;

        return await generateWithFallback(tokenCount, system, prompt);
    } catch (error) {
        console.error(`Error generating summary for ${doc.metadata.source}:`, error);
        return "Error generating summary.";
    }

}


export async function generateEmbedding(summary: string): Promise<number[]> {
    try {
        const result = await embed({
            model: gemini.embedding("gemini-embedding-001"),
            value: summary,
            providerOptions: {
                google: {
                    outputDimensionality: 768,
                },
            },
        });
        return result.embedding;
    } catch (error) {
        console.error(`Error generating embeddings for summary:`, error);
        throw new Error("Error generating embeddings.");
    }
}
