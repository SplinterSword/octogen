'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useRefetch from '@/hooks/use-refetch'

type FormInput = {
    repoUrl: string
    projectName: string
    githubToken?: string
}

const CreatePage = () => {
    const {register, handleSubmit, reset} = useForm<FormInput>()
    const createProject = api.project.create.useMutation()
    const refetch = useRefetch()

    const onSubmit = (data: FormInput) => {
        createProject.mutate({
            name: data.projectName,
            githubUrl: data.repoUrl,
            githubToken: data.githubToken
        },{
            onSuccess: () => {
                toast.success('Project created successfully')
                reset()
                refetch()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    return (
        <div className='flex items-center gap-12 h-full justify-center'>
            <img src="/undraw.github.svg" className="h-56 w-auto" alt="GitHub" />
            <div>
                <div>
                    <h1 className='font-semibold text-2xl'>
                        Link your GitHub repository
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Enter the URL of your GitHub repository to link it to Octogen
                    </p>
                </div>
                <div className='h-4'></div>
                <div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Input {...register('projectName', {required: true})} placeholder='Project Name' />
                        <div className='h-2'></div>
                        <Input {...register('repoUrl', {required: true})} placeholder='Github Repository URL' />
                        <div className='h-2'></div>
                        <Input {...register('githubToken')} placeholder='Github Token (optional)' />
                        <div className='h-4'></div>
                        <button type='submit' disabled={createProject.isPending} className={cn('bg-primary text-primary-foreground px-4 py-2 rounded-md', createProject.isPending && 'opacity-50 cursor-not-allowed')}>
                            Create Project
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CreatePage