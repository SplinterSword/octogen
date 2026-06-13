"use client"

import { api } from "@/trpc/react";
import { useProjects } from "@/hooks/use-projects"
import AskQuestionCard from "../dashboard/ask-question-card";
import { Fragment, useMemo, useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { CodeReferences } from "../dashboard/code-references";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const QAPage = () => {
    const { projectId } = useProjects()
    const { data: questions } = api.project.getQuestions.useQuery({ projectId: projectId! })
    const [questionIndex, setQuestionIndex] = useState<number | null>(null)
    const [open, setOpen] = useState(false)
    const question = questions?.[questionIndex ?? 0]

    const htmlContent = useMemo(() => {
        if (!question?.answer) return "";
        return DOMPurify.sanitize(marked.parse(question.answer) as string);
    }, [question?.answer]);

    const handleQuestionClick = (index: number) => {
        setQuestionIndex(index)
        setOpen(true)
    }

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartY(e.pageY);
        setScrollTop(scrollRef.current.scrollTop);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const y = e.pageY;
        const walk = (y - startY) * 2;
        scrollRef.current.scrollTop = scrollTop - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <>
            <AskQuestionCard />
            <div className="h-4"></div>
            <h1 className="text-x1 font-semibold">Saved Questions</h1>
            <div className="h-2"></div>
            <div className="flex flex-col gap-2">
                {questions?.map((question, index) => (
                    <Fragment key={question.id}>
                        <button onClick={() => handleQuestionClick(index)}>
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
                        </button>
                    </Fragment>
                ))}
            </div>

            {question && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                        <div className="sm:max-w-4xl overflow-x-hidden p-2">
                            <DialogHeader>
                                <div className="flex items-center gap-4 pb-4 border-b">
                                    <DialogTitle className="flex items-center gap-3">
                                        <img src={question.user.imageUrl ?? ""} alt="User Picture" height={30} width={30} className="rounded-full shrink-0" />
                                        <span className="text-xl font-semibold">{question.question}</span>
                                    </DialogTitle>
                                </div>
                            </DialogHeader>
                            
                            <div className="pt-4">
                                <div className="flex gap-4">
                                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                                        A
                                    </div>
                                    <div className="flex-1 overflow-x-hidden">
                                        <div 
                                            ref={scrollRef}
                                            onMouseDown={handleMouseDown}
                                            onMouseMove={handleMouseMove}
                                            onMouseUp={handleMouseUp}
                                            onMouseLeave={handleMouseUp}
                                            className={cn("prose dark:prose-invert max-w-full max-h-[40vh] overflow-y-auto", isDragging && "cursor-grabbing")}
                                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                                        />
                                        <div className="h-4"></div>
                                        <CodeReferences filesReferences={(question.filesReferences ?? []) as any} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default QAPage;
