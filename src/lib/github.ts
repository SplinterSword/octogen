import { db } from "@/server/db";
import { Octokit } from "octokit";
import { aiSummariseCommit } from "./ai-providers";
import axios from "axios";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

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

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
  const { owner, repo } = parseGithubRepo(githubUrl);

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
}

const fetchProjectGithubUrl = async (projectID: string): Promise<{ project: any, githubUrl: string }> => {
  const project = await db.project.findUnique({
    where: { id: projectID },
    select: { githubUrl: true }
  })
  console.log(project);
  if (!project?.githubUrl) {
    throw new Error("Project not found or github url not set");
  }
  return { project, githubUrl: project.githubUrl };
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

const summarizeCommit = async (githubUrl: string, commitHash: string): Promise<string> => {
  const { owner, repo } = parseGithubRepo(githubUrl);
  const diffUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${commitHash}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.diff",
    "User-Agent": "octogen",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const { data } = await axios.get<string>(diffUrl, {
    headers,
    responseType: "text",
  });

  console.log("data length:", data.length);

  const summary = await aiSummariseCommit(data);
  return summary || "";
}



export const pullCommits = async (projectID: string) => {
  const { githubUrl } = await fetchProjectGithubUrl(projectID);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(commitHashes, projectID);

  // Process commits in parallel batches of 3 to avoid overwhelming APIs
  const CONCURRENCY = 3;
  const summaries: string[] = new Array(unprocessedCommits.length).fill("");

  for (let i = 0; i < unprocessedCommits.length; i += CONCURRENCY) {
    const batch = unprocessedCommits.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(commit => summarizeCommit(githubUrl, commit.commitHash))
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
