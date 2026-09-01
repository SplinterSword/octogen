import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { pullCommits } from "@/lib/github";
import { checkCredits, indexGithubRepo } from "@/lib/github-loader";
import { encryptToken } from "@/lib/encryption";

export const projectRouter = createTRPCRouter({
    create: protectedProcedure.input(
        z.object({
            name: z.string(),
            githubUrl: z.string(),
            githubToken: z.string().optional(),
        })
    ).mutation(async ({ctx, input }) => {
        const user = await ctx.db.user.findUnique({
            where: {
                id: ctx.user.userId!,
            },
            select: {
                credits: true
            }
        })
        
        if (!user) {
            throw new Error("User not found")
        }

        const currentCredits = user.credits || 0
        const fileCount = await checkCredits(input.githubUrl, input.githubToken)

        if (fileCount > currentCredits) {
            throw new Error("Not enough credits")
        }

        const sanitizedToken = input.githubToken?.trim() ? input.githubToken.trim() : null;
        const encryptedToken = sanitizedToken ? encryptToken(sanitizedToken) : null;

        const project = await ctx.db.project.create({
            data: {
                name: input.name,
                githubUrl: input.githubUrl,
                githubToken: encryptedToken,
                userToProjects: {
                    create: {
                        userId: ctx.user.userId!,
                    }
                }
            }
        })
        try {
            await indexGithubRepo(project.id, project.githubUrl, sanitizedToken ?? undefined)
            await pullCommits(project.id, sanitizedToken ?? undefined)
            await ctx.db.user.update({
                where: {
                    id: ctx.user.userId!,
                },
                data: {
                    credits: { decrement: fileCount }
                }
            })
        } catch (error: any) {
            // Cleanup: avoid leaking empty project when indexing/commit fetch fails
            // (e.g. private repo without token, invalid token). Credits not deducted.
            await ctx.db.sourceCodeEmbedding.deleteMany({ where: { projectId: project.id } }).catch(() => {})
            await ctx.db.commit.deleteMany({ where: { projectId: project.id } }).catch(() => {})
            await ctx.db.userToProject.deleteMany({ where: { projectId: project.id } }).catch(() => {})
            await ctx.db.project.delete({ where: { id: project.id } }).catch(() => {})
            throw error
        }
        return project
    }),
    getProjects: protectedProcedure.query(async ({ctx}) => {
        const projects = await ctx.db.project.findMany({
            where: {
                userToProjects: {
                    some: {
                        userId: ctx.user.userId!,
                    }
                },
                deletedAt: null,
            },
            // never expose stored githubToken to client
            omit: { githubToken: true }
        })
        return projects
    }),
    getCommits: protectedProcedure.input(
        z.object({
            projectId: z.string(),
        })
    ).query(async ({ctx, input}) => {
        await pullCommits(input.projectId).catch((error) => {
            console.error(error)
        })
        const commits = await ctx.db.commit.findMany({
            where: {
                projectId: input.projectId,
            }
        })
        return commits
    }),
    saveAnswer: protectedProcedure.input(
        z.object({
            projectId: z.string(),
            question: z.string(),
            filesReferences: z.any(),
            answer: z.string()
        })
    ).mutation(async ({ctx, input}) => {
        const question = await ctx.db.questions.create({
            data: {
                question: input.question,
                filesReferences: input.filesReferences,
                answer: input.answer,
                projectId: input.projectId,
                userId: ctx.user.userId!,
            }
        })
        return question
    }),
    getQuestions: protectedProcedure.input(
        z.object({
            projectId: z.string(),
        })
    ).query(async ({ctx, input}) => {
        const questions = await ctx.db.questions.findMany({
            where: {
                projectId: input.projectId,
            },
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        return questions
    }),
    uploadMeeting: protectedProcedure.input(
        z.object({
            projectId: z.string(),
            meetingUrl: z.string(),
            name: z.string(),
        })
    ).mutation(async ({ctx, input}) => {
        const meeting = await ctx.db.meeting.create({
            data: {
                name: input.name,
                meetingUrl: input.meetingUrl,
                projectId: input.projectId,
                status: "PROCESSING"
            }
        })
        return meeting
    }),
    getMeetings: protectedProcedure.input(
        z.object({
            projectId: z.string(),
        })
    ).query(async ({ctx, input}) => {
        const meetings = await ctx.db.meeting.findMany({
            where: {
                projectId: input.projectId,
            },
            include: {
                issues: true
            }
        })
        return meetings
    }),
    deleteMeeting: protectedProcedure.input(
        z.object({
            meetingId: z.string(),
        })
    ).mutation(async ({ctx, input}) => {
        await ctx.db.issue.deleteMany({
            where: {
                meetingId: input.meetingId,
            }
        })
        const meeting = await ctx.db.meeting.delete({
            where: {
                id: input.meetingId,
            }
        })
        return meeting
    }),
    getMeetingById: protectedProcedure.input(
        z.object({
            meetingId: z.string(),
        })
    ).query(async ({ctx, input}) => {
        const meeting = await ctx.db.meeting.findUnique({
            where: {
                id: input.meetingId,
            },
            include: {
                issues: true
            }
        })
        return meeting
    }),
    archiveProject: protectedProcedure.input(
        z.object({
            projectId: z.string(),
        })
    ).mutation(async ({ctx, input}) => {
        const project = await ctx.db.project.update({
            where: {
                id: input.projectId,
            },
            data: {
                deletedAt: new Date() 
            }
        })

        await ctx.db.userToProject.deleteMany({
            where: {
                projectId: input.projectId
            }
        })

        await ctx.db.commit.deleteMany({
            where: {
                projectId: input.projectId,
            }
        })

        await ctx.db.sourceCodeEmbedding.deleteMany({
            where: {
                projectId: input.projectId
            }
        })

        await ctx.db.issue.deleteMany({
            where: {
                meeting: {
                    projectId: input.projectId
                }
            }
        })

        await ctx.db.meeting.deleteMany({
            where: {
                projectId: input.projectId
            }
        })

        await ctx.db.questions.deleteMany({
            where: {
                projectId: input.projectId
            }
        })

        await ctx.db.project.delete({
           where: {
                id: input.projectId
           } 
        })
        return project
    }),
    getTeamMembers: protectedProcedure.input(
        z.object({
            projectId: z.string(),
        })
    ).query(async ({ctx, input}) => {
        const teamMembers = await ctx.db.userToProject.findMany({
            where: {
                projectId: input.projectId,
            },
            include: {
                user: true
            }
        })
        return teamMembers
    }),
    getMyCredits: protectedProcedure.query(async ({ctx}) => {
        const credits = await ctx.db.user.findUnique({
            where: {
                id: ctx.user.userId!,
            },
            select: {
                credits: true
            }
        })
        return credits
    }),
    checkCredits: protectedProcedure.input(
        z.object({
            githubUrl: z.string(),
            githubToken: z.string().optional(),
        })
    ).mutation(async ({ctx, input}) => {
        const fileCount = await checkCredits(input.githubUrl, input.githubToken)
        const userCredits = await ctx.db.user.findUnique({
            where: {
                id: ctx.user.userId!,
            },
            select: {
                credits: true
            }
        })
        return {
            fileCount,
            userCredits: userCredits?.credits || 0
        }
    }),
});
