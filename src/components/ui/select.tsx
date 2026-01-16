import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const SelectContext = React.createContext<{
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
    triggerRef: React.RefObject<HTMLButtonElement | null>
} | null>(null)

const Select = ({ children, value, onValueChange }: any) => {
    const [open, setOpen] = React.useState(false)
    const triggerRef = React.useRef<HTMLButtonElement>(null)

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = ({ children, className }: any) => {
    const context = React.useContext(SelectContext)
    return (
        <button
            ref={context?.triggerRef}
            type="button"
            onClick={() => context?.setOpen(!context.open)}
            className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
        >
            {children}
            <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", context?.open && "rotate-180")} />
        </button>
    )
}

const SelectValue = ({ placeholder }: any) => {
    const context = React.useContext(SelectContext)
    return <span className={!context?.value ? "text-muted-foreground" : ""}>{context?.value || placeholder}</span>
}

const SelectContent = ({ children }: any) => {
    const context = React.useContext(SelectContext)
    const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (context?.open && context.triggerRef.current) {
            const rect = context.triggerRef.current.getBoundingClientRect()
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            })
        }
    }, [context?.open])

    React.useEffect(() => {
        if (!context?.open) return

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            // Don't close if clicking on trigger or inside content
            if (context.triggerRef.current?.contains(target)) return
            if (contentRef.current?.contains(target)) return
            context.setOpen(false)
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') context.setOpen(false)
        }

        // Use setTimeout to avoid catching the same click that opened the dropdown
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 0)
        document.addEventListener('keydown', handleEscape)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [context?.open])

    if (!context?.open) return null

    return createPortal(
        <div
            ref={contentRef}
            className="fixed z-[9999] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 text-gray-950 dark:text-gray-100 shadow-lg max-h-60 overflow-y-auto"
            style={{
                top: position.top,
                left: position.left,
                width: position.width,
                minWidth: '8rem'
            }}
        >
            {children}
        </div>,
        document.body
    )
}

const SelectItem = ({ children, value }: any) => {
    const context = React.useContext(SelectContext)
    const isSelected = context?.value === value
    return (
        <div
            onClick={() => {
                context?.onValueChange(value)
                context?.setOpen(false)
            }}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors",
                isSelected && "bg-blue-100 dark:bg-gray-600 font-medium"
            )}
        >
            {children}
        </div>
    )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
