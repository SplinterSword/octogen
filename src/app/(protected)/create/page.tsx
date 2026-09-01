'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useRefetch from '@/hooks/use-refetch'
import { Info, Loader2 } from 'lucide-react'

type FormInput = {
    repoUrl: string
    projectName: string
    githubToken?: string
}

const CreatePage = () => {
    const { register, handleSubmit, reset } = useForm<FormInput>()
    const createProject = api.project.create.useMutation()
    const checkCredits = api.project.checkCredits.useMutation()
    const refetch = useRefetch()

    const onSubmit = (data: FormInput) => {
        if (!!checkCredits.data) {
            createProject.mutate({
                name: data.projectName,
                githubUrl: data.repoUrl,
                githubToken: data.githubToken
            }, {
                onSuccess: () => {
                    toast.success('Project created successfully')
                    reset()
                    checkCredits.reset()
                    refetch()
                },
                onError: (error) => {
                    toast.error(error.message)
                }
            })
        } else {
            checkCredits.mutate({
                githubUrl: data.repoUrl,
                githubToken: data.githubToken
            }, {
                onError: (error) => {
                    console.log(error.message)
                    toast.error(error.message)
                }
            })
        }
    }

    const hasEnoughCredits = checkCredits.data?.userCredits ? checkCredits.data.userCredits >= checkCredits.data.fileCount : true

    return (
        <div className='relative flex items-center gap-12 h-full justify-center'>
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
                        <Input {...register('projectName', { required: true })} placeholder='Project Name' />
                        <div className='h-2'></div>
                        <Input {...register('repoUrl', { required: true })} placeholder='Github Repository URL' />
                        <div className='h-2'></div>
                        <Input {...register('githubToken')} placeholder='Github Token (Required for Private Repos)' />
                        <div className='h-4'></div>

                        {!!checkCredits.data && (
                            <div className='my-4 bg-orange-50 px-4 py-2 rounded-md border border-orange-200 text-orange-700'>
                                <div className="flex items-center gap-2">
                                    <Info className='size-4' />
                                    <p className="text-sm">You will be charged <strong>{checkCredits.data.fileCount}</strong> credits for this repository</p>
                                </div>
                                <p className="text-sm text-blue-600 ml-6">You have <strong>{checkCredits.data.userCredits}</strong> credits remaining.</p>
                            </div>
                        )}

                        <button type='submit' disabled={createProject.isPending || checkCredits.isPending || !hasEnoughCredits} className={cn('bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer', createProject.isPending || checkCredits.isPending && 'opacity-50 cursor-not-allowed')}>
                            {!!checkCredits.data ? 'Create Project' : 'Check credits'}
                        </button>
                    </form>
                </div>
            </div>
            {createProject.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Creating project......It might take some time to make, don't refresh the page or navigate out of it</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CreatePage
