import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github"
import { Document } from '@langchain/core/documents'
import { summarizeCode, generateEmbedding } from "./ai-providers";
import { db } from "@/server/db";
import { Octokit } from "octokit";

const getFileCount = async (path: string, octokit: Octokit, githubOwner: string, githubRepo: string, acc: number = 0) => {
    const { data } = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: path,
    });

    if (!Array.isArray(data) && data.type == "file") {
        return acc + 1;
    }

    if (Array.isArray(data)) {
        let fileCount = 0;
        let directories: string[] = [];

        for (const item of data) {
            if (item.type === "file") {
                fileCount++;
            } else if (item.type === "dir") {
                directories.push(item.path);
            }
        }

        // Recursively and asyncronously count files in directories
        if (directories.length > 0) {
            const directoryCounts = await Promise.all(directories.map(dirPath => getFileCount(dirPath, octokit, githubOwner, githubRepo, 0)));
            fileCount += directoryCounts.reduce((sum, count) => sum + count, 0);
        }

        return acc + fileCount;
    }

    return acc;
}

export async function checkCredits(githubUrl: string, githubToken?: string) {
    const octokit = new Octokit({
        auth: githubToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
    });

    const githubOwner = githubUrl.split("/")[3];
    const githubRepo = githubUrl.split("/")[4];

    if (!githubOwner || !githubRepo) {
        return 0
    }

    const fileCount = await getFileCount('', octokit, githubOwner, githubRepo, 0)

    return fileCount;
}

async function loadGithubRepo(githubUrl: string, githubToken?: string) {
    const loader = new GithubRepoLoader(
        githubUrl,
        {
            branch: "main",
            ignoreFiles: [
                "node_modules", ".git", ".github",
                "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock",
                "Pipfile.lock", "poetry.lock", "composer.lock", "Gemfile.lock",
                "dist", "build", ".next", ".env",
            ],
            recursive: true,
            unknown: "warn",
            maxConcurrency: 5,
            accessToken: githubToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
        }
    );
    const docs = await loader.load();
    console.log(docs);
    return docs;
}

const generateEmbeddings = async (docs: Document[]) => {
    const CONCURRENCY = 3;
    const results: { summary: string; embedding: number[]; sourceCode: string; fileName: string }[] = [];

    for (let i = 0; i < docs.length; i += CONCURRENCY) {
        const batch = docs.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.allSettled(
            batch.map(async doc => {
                const summary = await summarizeCode(doc);
                const embedding = await generateEmbedding(summary);
                return {
                    summary,
                    embedding,
                    sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
                    fileName: doc.metadata.source
                };
            })
        );

        for (const result of batchResults) {
            if (result.status === "fulfilled") {
                results.push(result.value);
            } else {
                console.error(`Failed to generate embedding for batch item:`, result.reason);
            }
        }

        console.log(`Processed ${Math.min(i + CONCURRENCY, docs.length)}/${docs.length} files`);
    }

    return results;
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
