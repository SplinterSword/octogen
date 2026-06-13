`use client`

import { useMemo, useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { askQuestion } from "./action";
import { readStreamableValue } from "@ai-sdk/rsc";
import { CodeReferences } from "./code-references";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import useRefetch from "@/hooks/use-refetch";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AskQuestionCard() {
    const { project } = useProjects();
    const [question, setQuestion] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileReferences, setFileReferences] = useState<{ fileName: string, sourceCode: string, summary: string, similarity: number }[]>([]);
    const [answer, setAnswer] = useState("");
    const saveAnswer = api.project.saveAnswer.useMutation();
    const refetch = useRefetch()
    
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

    const htmlContent = useMemo(() => {
        if (!answer) return "";
        return DOMPurify.sanitize(marked.parse(answer) as string);
    }, [answer]);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAnswer('')
        setFileReferences([])
        if (!project?.id) return
        setLoading(true)

        const { output, filesReferences } = await askQuestion(question, project.id)
        setOpen(true)
        setFileReferences(filesReferences)

        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                setAnswer(prev => prev + delta)
            }
        }
        setLoading(false)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    <div className="sm:max-w-4xl overflow-x-hidden">
                        <DialogHeader>
                            <div className="flex items-center gap-4 pb-4 border-b">
                                <DialogTitle className="flex items-center gap-3">
                                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-semibold">
                                        Q
                                    </div>
                                    <span className="text-xl font-semibold">{question}</span>
                                </DialogTitle>
                                <div className="ml-auto">
                                    <Button disabled={saveAnswer.isPending} variant="outline" onClick={() => {
                                        saveAnswer.mutate({
                                            projectId: project!.id,
                                            question,
                                            answer,
                                            filesReferences: fileReferences
                                        }, {
                                            onSuccess: () => {
                                                toast.success("Answer Saved!")
                                                refetch()
                                            },
                                            onError: () => {
                                                toast.error('Failed to save answer!')
                                            }
                                        });
                                    }}>
                                        Save
                                    </Button>
                                </div>
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
                                    <CodeReferences filesReferences={fileReferences} />
                                </div>
                            </div>
                        </div>
                    </div>

                </DialogContent>
            </Dialog>
            <motion.div className="col-span-3" whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Card className='relative h-full transition-shadow hover:shadow-xl'>
                    <CardHeader>
                        <CardTitle>Ask a Question</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit}>
                            <Textarea
                                value={question}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)}
                                placeholder='Which file should I edit to change the homepage ?'
                                className="min-h-48"
                            />
                            <div className="h-4"></div>
                            <Button type='submit' disabled={loading} className="self-end">
                                Ask Octogen!
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </>
    );
}