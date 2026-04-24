import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github"

export async function loadGithubRepo(githubUrl: string, githubToken?: string) {
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

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    // TODO: Store embeddings in database
}
