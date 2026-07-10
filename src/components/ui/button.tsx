import * as React from "react"
import { cn } from "../../lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800",
    destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
    outline: "border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
    link: "bg-transparent text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400",
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3 text-xs",
    lg: "h-11 rounded-md px-8 text-base",
    icon: "h-10 w-10 p-0",
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
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-gray-950",
            variantClasses[variant],
            sizeClasses[size],
            className
        )}
        {...props}
    />
))
Button.displayName = "Button"

export { Button }
