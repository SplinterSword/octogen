'use client'

import { api } from "@/trpc/react"
import { Info } from "lucide-react"
import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createCheckoutSession } from "@/lib/stripe"

export default function BillingPage() {
    const { data: user } = api.project.getMyCredits.useQuery()
    const [creditsToBuy, setCreditsToBuy] = useState([100])
    const creditsToBuyAmount = creditsToBuy[0]
    const price = (creditsToBuyAmount! / 50).toFixed(2)

    return (
        <>
            <div>
                <h1 className="text-xl font-semibold">Billing</h1>
                <div className="h-3"></div>
                <p className="text-sm text-gray-500">
                    You currently have {user?.credits} credits
                </p>
                <div className="h-4"></div>
                <div className="bg-blue-50 px-4 py-2 rounded-md border border-blue-200 text-blue-700 flex items-center gap-2 ">
                    <Info className='size-4' />
                    <p className="text-sm">Each credit allows you to index 1 file in a repository</p>
                </div>
                <div className="h-4"></div>
                <h2 className="text-sm">E.g. If your Project has 100 files, you will need 100 credits</h2>
            </div>
            <div className="h-6"></div>
            <Slider defaultValue={[100]} max={1000} min={100} step={10} onValueChange={(value: number[]) => setCreditsToBuy(value)} value={creditsToBuy} />
            <div className="h-4"></div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        Buy {creditsToBuyAmount} credits for ${price}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Stripe Test Environment</DialogTitle>
                        <DialogDescription>
                            This project is currently using the Stripe test environment to showcase its checkout functionality to recruiters. No real charges will be made. Please use Stripe test cards if you would like to test the payment process.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => createCheckoutSession(creditsToBuyAmount!)}>
                            Proceed to Checkout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}