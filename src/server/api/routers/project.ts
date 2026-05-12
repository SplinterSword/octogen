import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { pullCommits } from "@/lib/github";
import { checkCredits, indexGithubRepo } from "@/lib/github-loader";

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
                credits:true
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

        const project = await ctx.db.project.create({
            data: {
                name: input.name,
                githubUrl: input.githubUrl,
                userToProjects: {
                    create: {
                        userId: ctx.user.userId!,
                    }
                }
            }
        })
        await indexGithubRepo(project.id, project.githubUrl, input.githubToken)
        await pullCommits(project.id)
        await ctx.db.user.update({
            where: {
                id: ctx.user.userId!,
            },
            data: {
                credits: { decrement: fileCount }
            }
        })
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
            }
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
