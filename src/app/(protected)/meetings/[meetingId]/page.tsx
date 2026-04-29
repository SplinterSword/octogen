type Props = {
    params: Promise<{
        meetingId: string
    }>
}

const MeetingDetailsPage = async ({ params }: Props) => {
    const { meetingId } = await params
    return (
        <div>
            <h1>Meeting Details</h1>
            <p>Meeting ID: {meetingId}</p>
        </div>
    )
}

export default MeetingDetailsPage