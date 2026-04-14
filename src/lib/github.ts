import { db } from "@/server/db";
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const githubUrl = "https://github.com/SplinterSword/small_code"

type Response = {
    commitHash: string;
    commitMessage: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
}

export const getCommitHashes = async (githubUrl: string) : Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid github url");
  }
    
  const { data } = await octokit.rest.repos.listCommits({
    owner: owner,
    repo: repo,
  });

  const sortedCommits = data.sort((a:any, b:any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime());
  return sortedCommits.slice(0, 15).map((commit:any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit.author?.avatar_url || "",
    commitDate: commit.commit?.author?.date ?? "",
  }));
}

const fetchProjectGithubUrl = async (projectID: string) : Promise<{project: any, githubUrl: string}> => {
  const project = await db.project.findUnique({
    where: { id: projectID },
    select: { githubUrl: true }
  })
  console.log(project);
  if (!project?.githubUrl) {
    throw new Error("Project not found or github url not set");
  }
  return {project, githubUrl: project.githubUrl};
}

const filterUnprocessedCommits = async (commitHashes: Response[], projectID: string) : Promise<Response[]> => {
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





export const pullCommits = async (projectID: string) : Promise<Response[]> => {
  const { githubUrl } = await fetchProjectGithubUrl(projectID);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(commitHashes, projectID);
  return unprocessedCommits;
}

console.log(await pullCommits("cmnwqpfqh00065dy3q52hjdyk"));
