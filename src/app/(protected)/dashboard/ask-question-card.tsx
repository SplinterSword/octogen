`use client`

import MDEditor from "@uiw/react-md-editor"
import { useState } from "react";
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

export default function AskQuestionCard() {
    const { project } = useProjects();
    const [question, setQuestion] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileReferences, setFileReferences] = useState<{ fileName: string, sourceCode: string, summary: string, similarity: number }[]>([]);
    const [answer, setAnswer] = useState("");
    const saveAnswer = api.project.saveAnswer.useMutation();
    const refetch = useRefetch()

    const onSubmit = async (e:React.FormEvent<HTMLFormElement>) => {
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
                <DialogContent className="sm:max-w-[80vm]">
                    <DialogHeader>
                        <div className="flex items-center-gap-2">    
                            <DialogTitle>
                                <div className="w-8 h-8 bg-primary rounded-full"></div>
                            </DialogTitle>
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
                                Close
                            </Button>
                        </div>
                    </DialogHeader>

                    <MDEditor.Markdown source={answer} className="max-w-[70vm] !h-full max-h-[40vh] overflow-scroll"/>
                    <div className="h-4"></div>
                    <CodeReferences filesReferences={fileReferences} />

                    <Button type="button" onClick={() => { setOpen(false) }}>
                        Close
                    </Button>

                </DialogContent>
            </Dialog>
            <Card className='relative col-span-3'>
                <CardHeader>
                    <CardTitle>Ask a Question</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <Textarea 
                            value={question}
                            onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)}
                            placeholder='Which file should I edit to change the homepage ?' 
                        />
                        <div className="h-4"></div>
                        <Button type='submit' disabled={loading}>
                            Ask Octogen!
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}