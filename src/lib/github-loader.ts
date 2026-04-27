import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github"
import { Document } from '@langchain/core/documents'
import { summarizeCode, generateEmbedding } from "./ai-providers";
import { db } from "@/server/db";

async function loadGithubRepo(githubUrl: string, githubToken?: string) {
    const loader = new GithubRepoLoader(
        githubUrl,
        {
            branch: "main",
            ignoreFiles: ["node_modules", ".git", ".github", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"],
            recursive: true,
            unknown: "warn",
            maxConcurrency: 5,
            accessToken: githubToken || "",
        }
    );
    const docs = await loader.load();
    console.log(docs);
    return docs;
}

const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async doc => {
        const summary = await summarizeCode(doc)
        const embedding = await generateEmbedding(summary)
        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source
        }
    }))
}

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs)
    await Promise.allSettled(allEmbeddings.map(async (embedding, index) => {
        console.log(`processing ${index} of ${allEmbeddings.length}`)

        if (!embedding) {
            console.error(`Failed to generate embedding for document ${index}`)
            return
        }

        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
                projectId,
                fileName: embedding.fileName,
                summary: embedding.summary,
                sourceCode: embedding.sourceCode,
            }
        })

        await db.$executeRaw`
            UPDATE "SourceCodeEmbedding"
            SET "summaryEmbedding" = ${embedding.embedding}::vector
            WHERE "id" = ${sourceCodeEmbedding.id}
        `
    }))
}
