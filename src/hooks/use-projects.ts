import { api } from '@/trpc/react'
import { useLocalStorage } from 'usehooks-ts'

const useProjects = () => {
    const {data: projects} = api.project.getProjects.useQuery()
    const [projectId, setProjectId] = useLocalStorage('octogen-project-id', null)
    const project = projects?.find((project) => project.id === projectId)
    
    return {
        projects,
        project,
        projectId,
        setProjectId,
    }
}

export { useProjects }