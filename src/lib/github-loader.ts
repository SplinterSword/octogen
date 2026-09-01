import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github"
import { Document } from '@langchain/core/documents'
import { summarizeCode, generateEmbedding } from "./ai-providers";
import { db } from "@/server/db";
import { Octokit } from "octokit";

function resolveGithubToken(providedToken?: string): string | undefined {
    const trimmed = providedToken?.trim();
    if (trimmed) return trimmed;
    // Unified env var — support both names for backwards compat
    return process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || undefined;
}

function mapGithubError(error: any, githubUrl: string): never {
    const status = error?.status ?? error?.response?.status;
    const message: string = error?.message ?? "";

    // 404 from GitHub is ambiguous: repo doesn't exist OR private without auth / insufficient scope
    if (status === 404) {
        throw new Error(
            `Repository not found or is private (${githubUrl}). If it's a private repository, please provide a valid GitHub token with 'repo' access.`
        );
    }
    if (status === 401 || message.toLowerCase().includes("bad credentials")) {
        throw new Error("Invalid GitHub token. Please check your token and try again.");
    }
    if (status === 403) {
        // Could be rate-limit or forbidden (e.g. token without repo scope on private repo)
        const isRateLimit = message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("api rate limit");
        if (isRateLimit) {
            throw new Error("GitHub API rate limit exceeded. Please try again later or provide a GitHub token to increase limits.");
        }
        throw new Error("Access denied to this repository. If it's private, ensure your token has 'repo' scope.");
    }
    // Re-throw with original message for debugging
    throw new Error(error?.message ?? "Failed to access GitHub repository.");
}

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

const parseGithubRepoForLoader = (githubUrl: string): { owner: string; repo: string } | null => {
    try {
        const pathname = new URL(githubUrl.replace(/\.git$/, "")).pathname;
        const [owner, repo] = pathname.split("/").filter(Boolean);
        if (!owner || !repo) return null;
        return { owner, repo };
    } catch {
        return null;
    }
}

export async function checkCredits(githubUrl: string, githubToken?: string) {
    const token = resolveGithubToken(githubToken);
    const octokit = new Octokit({
        auth: token,
    });

    const parsed = parseGithubRepoForLoader(githubUrl);
    if (!parsed) {
        return 0
    }
    const { owner: githubOwner, repo: githubRepo } = parsed;

    try {
        const fileCount = await getFileCount('', octokit, githubOwner, githubRepo, 0)
        return fileCount;
    } catch (error: any) {
        mapGithubError(error, githubUrl);
    }
}

async function loadGithubRepo(githubUrl: string, githubToken?: string) {
    const token = resolveGithubToken(githubToken);
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
            accessToken: token,
        }
    );
    try {
        const docs = await loader.load();
        console.log(docs);
        return docs;
    } catch (error: any) {
        mapGithubError(error, githubUrl);
    }
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
