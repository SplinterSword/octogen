"use client"

import { api } from "@/trpc/react";
import { useProjects } from "@/hooks/use-projects"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import AskQuestionCard from "../dashboard/ask-question-card";
import { Fragment, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { CodeReferences } from "../dashboard/code-references";

const QAPage = () => {
    const { projectId } = useProjects()
    const { data: questions } = api.project.getQuestions.useQuery({ projectId: projectId! })
    const [questionIndex, setQuestionIndex] = useState<number | null>(null)
    const question = questions?.[questionIndex ?? 0]

    return (
        <Sheet>
            <AskQuestionCard />
            <div className="h-4"></div>-
            <h1 className="text-x1 font-semibold">Saved Questions</h1>
            <div className="h-2"></div>
            <div className="flex flex-col gap-2">
                {questions?.map((question, index) => (
                    <Fragment key={question.id}>
                        <SheetTrigger onClick={() => setQuestionIndex(index)}>
                            <div className="flex items-center gap-4 bg-white rounded-lg p-4 shadow border">
                                <img src={question.user.imageUrl ?? ""} alt="User Picture" height={30} width={30} className="rounded-full" />
                                <div className="text-left flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <p className="text-gray-700 line-clamp-1 text-lg font-medium">
                                            {question.question}
                                        </p>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {question.createdAt.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm line-clamp-1">
                                        {question.answer}
                                    </p>
                                </div>
                            </div>
                        </SheetTrigger>
                    </Fragment>
                ))}
            </div>

            {question && (
                <SheetContent className="sm:max-w-[80vw]">
                    <SheetHeader>
                        <SheetTitle>
                            {question.question}
                        </SheetTitle>
                        <MDEditor.Markdown source={question.answer} />
                        <CodeReferences filesReferences={(question.filesReferences ?? []) as any} />
                    </SheetHeader>
                </SheetContent>
            )}
        </Sheet>
    );
};

export default QAPage;