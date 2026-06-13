"use client"

import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { lucario } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = {
    filesReferences: {fileName: string; sourceCode: string; summary: string}[]
}

export function CodeReferences({filesReferences}: Props) {
    const [tab, setTab] = useState(filesReferences[0]?.fileName)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)

    if (filesReferences.length === 0) return null

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY !== 0 && scrollRef.current) {
            e.preventDefault()
            scrollRef.current.scrollLeft += e.deltaY
        }
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return
        setIsDragging(true)
        setStartX(e.pageX - scrollRef.current.offsetLeft)
        setScrollLeft(scrollRef.current.scrollLeft)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !scrollRef.current) return
        e.preventDefault()
        const x = e.pageX - scrollRef.current.offsetLeft
        const walk = (x - startX) * 2
        scrollRef.current.scrollLeft = scrollLeft - walk
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    return (
        <div className="w-full">
            <Tabs value={tab} onValueChange={setTab}>
                <div 
                    ref={scrollRef}
                    className={cn(
                        "overflow-x-auto scrollbar-hide flex gap-2 bg-muted p-1 rounded-md",
                        isDragging && "cursor-grabbing"
                    )}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {filesReferences.map((file) => (
                        <button key={file.fileName} onClick={() => setTab(file.fileName)} className={cn(
                            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                            {
                                'text-muted-foreground hover:bg-muted-foreground/10': tab !== file.fileName,
                                'bg-primary text-primary-foreground': tab === file.fileName,
                            }
                        )}>
                            {file.fileName}
                        </button>
                    ))} 
                </div>
                {filesReferences.map((file) => (
                    <TabsContent key={file.fileName} value={file.fileName} className="max-w-full max-h-[40vh] overflow-y-auto border border-border rounded-lg">
                        <SyntaxHighlighter language="typescript" style={lucario}>
                            {file.sourceCode}
                        </SyntaxHighlighter>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}