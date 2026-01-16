import * as React from "react"
import { cn } from "../../lib/utils"

const SelectContext = React.createContext<{
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
} | null>(null)

const Select = ({ children, value, onValueChange }: any) => {
    const [open, setOpen] = React.useState(false)
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = ({ children, className }: any) => {
    const context = React.useContext(SelectContext)
    return (
        <button
            type="button"
            onClick={() => context?.setOpen(!context.open)}
            className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
        >
            {children}
        </button>
    )
}

const SelectValue = ({ placeholder }: any) => {
    const context = React.useContext(SelectContext)
    return <span>{context?.value || placeholder}</span>
}

const SelectContent = ({ children }: any) => {
    const context = React.useContext(SelectContext)
    if (!context?.open) return null
    return (
        <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-gray-950 shadow-md">
            {children}
        </div>
    )
}

const SelectItem = ({ children, value }: any) => {
    const context = React.useContext(SelectContext)
    return (
        <div
            onClick={() => {
                context?.onValueChange(value)
                context?.setOpen(false)
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-100 cursor-pointer"
        >
            {children}
        </div>
    )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
