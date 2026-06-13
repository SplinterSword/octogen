import { SignIn } from '@clerk/nextjs'
import { OctogenLogo } from '@/components/octogen-logo'

export default function Page() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Glowing orb effect */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]"></div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <OctogenLogo className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-foreground">
            Welcome back to Octogen
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        
        <div className="flex w-full justify-center">
          <SignIn 
            appearance={{
              elements: {
                card: "bg-card/50 backdrop-blur-sm border-border shadow-2xl rounded-2xl",
                headerTitle: "hidden", 
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "bg-background/50 border-border text-foreground hover:bg-accent hover:text-accent-foreground",
                socialButtonsBlockButtonText: "font-semibold",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground",
                formFieldLabel: "text-foreground font-medium",
                formFieldInput: "bg-background/50 border-border text-foreground focus:ring-ring focus:border-ring rounded-lg",
                formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-md",
                footerActionText: "text-muted-foreground",
                footerActionLink: "text-primary hover:text-primary/90 font-medium",
                identityPreviewText: "text-foreground",
                identityPreviewEditButtonIcon: "text-muted-foreground hover:text-foreground",
                formFieldWarningText: "text-destructive",
                formFieldErrorText: "text-destructive",
                formFieldSuccessText: "text-green-500",
              }
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  )
}