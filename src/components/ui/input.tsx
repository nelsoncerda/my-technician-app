import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex h-10 w-full rounded-md border border-brand-control bg-brand-cream px-3 py-2 text-sm text-brand-charcoal ring-offset-brand-cream file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-brand-muted focus-visible:border-brand-ocean-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-sand disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:ring-offset-gray-950 dark:placeholder:text-gray-400",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Input.displayName = "Input"

export { Input }
