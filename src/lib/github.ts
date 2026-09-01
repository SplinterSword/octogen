import { db } from "@/server/db";
import { Octokit } from "octokit";
import { aiSummariseCommit } from "./ai-providers";
import axios from "axios";
import { decryptToken } from "./encryption";

function resolveGithubToken(providedToken?: string | null): string | undefined {
  const trimmed = providedToken?.trim();
  if (trimmed) return trimmed;
  return process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || undefined;
}

function getOctokit(githubToken?: string | null) {
  const token = resolveGithubToken(githubToken ?? undefined);
  return new Octokit({
    auth: token,
  });
}

function mapGithubError(error: any, githubUrl: string): never {
  const status = error?.status ?? error?.response?.status;
  const message: string = error?.message ?? "";

  if (status === 404) {
    throw new Error(
      `Repository not found or is private (${githubUrl}). If it's a private repository, please provide a valid GitHub token with 'repo' access.`
    );
  }
  if (status === 401 || message.toLowerCase().includes("bad credentials")) {
    throw new Error("Invalid GitHub token. Please check your token and try again.");
  }
  if (status === 403) {
    const isRateLimit = message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("api rate limit");
    if (isRateLimit) {
      throw new Error("GitHub API rate limit exceeded. Please try again later or provide a GitHub token to increase limits.");
    }
    throw new Error("Access denied to this repository. If it's private, ensure your token has 'repo' scope.");
  }
  throw new Error(error?.message ?? "Failed to access GitHub repository.");
}

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
}

const parseGithubRepo = (githubUrl: string): { owner: string; repo: string } => {
  let pathname = "";

  try {
    pathname = new URL(githubUrl.replace(/\.git$/, "")).pathname;
  } catch {
    throw new Error("Invalid github url");
  }

  const [owner, repo] = pathname.split("/").filter(Boolean);

  if (!owner || !repo) {
    throw new Error("Invalid github url");
  }

  return { owner, repo };
}

export const getCommitHashes = async (githubUrl: string, githubToken?: string | null): Promise<Response[]> => {
  const { owner, repo } = parseGithubRepo(githubUrl);
  const octokit = getOctokit(githubToken);

  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
    });

    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime());
    return sortedCommits.slice(0, 15).map((commit: any) => ({
      commitHash: commit.sha as string,
      commitMessage: commit.commit.message ?? "",
      commitAuthorName: commit.commit?.author?.name ?? "",
      commitAuthorAvatar: commit.author?.avatar_url || "",
      commitDate: commit.commit?.author?.date ?? "",
    }));
  } catch (error: any) {
    mapGithubError(error, githubUrl);
  }
}

const fetchProjectGithubUrl = async (projectID: string): Promise<{ project: any, githubUrl: string, githubToken: string | null }> => {
  const project = await db.project.findUnique({
    where: { id: projectID },
    select: { githubUrl: true, githubToken: true }
  })
  console.log(project);
  if (!project?.githubUrl) {
    throw new Error("Project not found or github url not set");
  }
  const decryptedToken = decryptToken(project.githubToken ?? null);
  return { project, githubUrl: project.githubUrl, githubToken: decryptedToken };
}

const filterUnprocessedCommits = async (commitHashes: Response[], projectID: string): Promise<Response[]> => {
  const processedCommits = await db.commit.findMany({
    where: {
      projectId: projectID,
      commitHash: {
        in: commitHashes.map(hash => hash.commitHash)
      }
    },
    select: { commitHash: true }
  });
  return commitHashes.filter(hash => !processedCommits.some(commit => commit.commitHash === hash.commitHash));
}

const summarizeCommit = async (githubUrl: string, commitHash: string, githubToken?: string | null): Promise<string> => {
  const { owner, repo } = parseGithubRepo(githubUrl);
  const diffUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${commitHash}`;
  const token = resolveGithubToken(githubToken ?? undefined);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.diff",
    "User-Agent": "octogen",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const { data } = await axios.get<string>(diffUrl, {
      headers,
      responseType: "text",
    });

    console.log("data length:", data.length);

    const summary = await aiSummariseCommit(data);
    return summary || "";
  } catch (error: any) {
    const status = error?.response?.status;
    if (status) {
      // Normalize axios error shape to match mapGithubError
      error.status = status;
    }
    mapGithubError(error, githubUrl);
  }
}



export const pullCommits = async (projectID: string, providedGithubToken?: string | null) => {
  const { githubUrl, githubToken: storedToken } = await fetchProjectGithubUrl(projectID);
  // Priority: explicitly provided token > stored project token > env token
  const effectiveToken = providedGithubToken ?? storedToken ?? undefined;
  const commitHashes = await getCommitHashes(githubUrl, effectiveToken);
  const unprocessedCommits = await filterUnprocessedCommits(commitHashes, projectID);

  // Process commits in parallel batches of 3 to avoid overwhelming APIs
  const CONCURRENCY = 3;
  const summaries: string[] = new Array(unprocessedCommits.length).fill("");

  for (let i = 0; i < unprocessedCommits.length; i += CONCURRENCY) {
    const batch = unprocessedCommits.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(commit => summarizeCommit(githubUrl, commit.commitHash, effectiveToken))
    );

    batchResults.forEach((result, j) => {
      summaries[i + j] = result.status === "fulfilled"
        ? result.value.trim()
        : "";

      if (result.status === "rejected") {
        console.error(`Failed to summarize commit ${i + j}:`, result.reason);
      }
    });
  }

  if (unprocessedCommits.length === 0) {
    return { count: 0 };
  }

  const commits = await db.commit.createMany({
    data: summaries.map((summary, index) => {
      console.log(`processing commit ${index}`);
      return {
        projectId: projectID,
        commitHash: unprocessedCommits[index]!.commitHash,
        commitMessage: unprocessedCommits[index]!.commitMessage,
        commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
        commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
        commitDate: new Date(unprocessedCommits[index]!.commitDate),
        summary
      }
    })
  });
  return commits;
}
