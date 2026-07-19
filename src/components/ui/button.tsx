import * as React from "react"
import { cn } from "../../lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default: "bg-brand-ocean-500 text-white shadow-sm hover:bg-brand-ocean-600 active:bg-brand-ocean-700",
    destructive: "bg-brand-danger-600 text-white shadow-sm hover:bg-brand-danger-700 active:bg-brand-danger-800",
    outline: "border border-brand-border bg-brand-cream text-brand-charcoal shadow-sm hover:bg-brand-sand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
    secondary: "bg-brand-sand text-brand-charcoal shadow-sm hover:bg-brand-border dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
    ghost: "bg-transparent text-brand-charcoal hover:bg-brand-sand dark:text-gray-100 dark:hover:bg-gray-800",
    link: "bg-transparent text-brand-ocean-700 underline-offset-4 hover:underline dark:text-brand-ocean-100",
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
    default: "min-h-11 px-4 py-2",
    sm: "min-h-11 rounded-md px-3 py-2 text-xs",
    lg: "h-11 rounded-md px-8 text-base",
    icon: "h-11 w-11 p-0",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = "default",
    size = "default",
    ...props
}, ref) => (
    <button
        ref={ref}
        className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-brand-ocean-500 dark:focus-visible:ring-offset-gray-950",
            variantClasses[variant],
            sizeClasses[size],
            className
        )}
        {...props}
    />
))
Button.displayName = "Button"

export { Button }
