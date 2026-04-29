import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLY_AI_API_KEY || ""
})

function msToTime(ms: number) {
    const seconds = ms / 1000;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export const processMeeting = async (meetingUrl: string) => {
    if (!meetingUrl) {
        throw new Error('Meeting URL is required');
    }
    if (!process.env.ASSEMBLY_AI_API_KEY) {
        throw new Error('AssemblyAI API key is required');
    }

    const transcript = await client.transcripts.transcribe({
        audio: meetingUrl,
        auto_chapters: true,
        speech_models: ["universal-3-pro", "universal-2"]
    });
    
    const summaries = transcript.chapters?.map((chapter) => ({
        headline: chapter.headline,
        summary: chapter.summary,
        gist: chapter.gist,
        start: msToTime(chapter.start),
        end: msToTime(chapter.end),
    })) || [];

    if (!transcript.text) throw new Error("No transcript found")

    return { 
        summaries
    }
}

const FILE_URL = 'https://assembly.ai/sports_injuries.mp3'

const response = await processMeeting(FILE_URL)
console.log(response)