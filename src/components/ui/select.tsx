import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

type OpenPreference = "selected" | "first" | "last"
type MoveDirection = 1 | -1 | "first" | "last"

interface RegisteredOption {
    value: string
    label: string
    id: string
    disabled: boolean
}

interface SelectContextValue {
    value: string
    disabled: boolean
    open: boolean
    activeValue: string | null
    activeOptionId?: string
    options: ReadonlyMap<string, RegisteredOption>
    triggerId: string
    contentId: string
    triggerRef: React.RefObject<HTMLButtonElement | null>
    contentRef: React.RefObject<HTMLDivElement | null>
    openSelect: (preference?: OpenPreference) => void
    closeSelect: (returnFocus?: boolean) => void
    moveActive: (direction: MoveDirection) => void
    selectValue: (value: string) => void
    setActiveValue: React.Dispatch<React.SetStateAction<string | null>>
    registerOption: (option: RegisteredOption) => () => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

const useSelectContext = (componentName: string) => {
    const context = React.useContext(SelectContext)

    if (!context) {
        throw new Error(`${componentName} must be used inside Select`)
    }

    return context
}

interface SelectProps {
    children: React.ReactNode
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
    className?: string
}

const Select = ({
    children,
    value: controlledValue,
    defaultValue = "",
    onValueChange,
    disabled = false,
    className,
}: SelectProps) => {
    const isControlled = controlledValue !== undefined
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
    const [open, setOpen] = React.useState(false)
    const [activeValue, setActiveValue] = React.useState<string | null>(null)
    const [options, setOptions] = React.useState<Map<string, RegisteredOption>>(() => new Map())
    const optionsRef = React.useRef(options)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const generatedId = React.useId().replace(/:/g, "")
    const triggerId = `select-${generatedId}-trigger`
    const contentId = `select-${generatedId}-content`
    const value = isControlled ? controlledValue ?? "" : uncontrolledValue

    const registerOption = React.useCallback((option: RegisteredOption) => {
        setOptions((current) => {
            const existing = current.get(option.value)
            if (
                existing?.id === option.id &&
                existing.label === option.label &&
                existing.disabled === option.disabled
            ) {
                return current
            }

            const next = new Map(current)
            next.set(option.value, option)
            optionsRef.current = next
            return next
        })

        return () => {
            setOptions((current) => {
                if (current.get(option.value)?.id !== option.id) return current

                const next = new Map(current)
                next.delete(option.value)
                optionsRef.current = next
                return next
            })
        }
    }, [])

    const getEnabledValues = React.useCallback(() => {
        const renderedOptions = contentRef.current
            ? Array.from(contentRef.current.querySelectorAll<HTMLElement>("[role='option'][data-value]"))
            : []

        if (renderedOptions.length > 0) {
            return renderedOptions
                .filter((option) => option.getAttribute("aria-disabled") !== "true")
                .map((option) => option.dataset.value)
                .filter((optionValue): optionValue is string => optionValue !== undefined)
        }

        return Array.from(optionsRef.current.values())
            .filter((option) => !option.disabled)
            .map((option) => option.value)
    }, [])

    const openSelect = React.useCallback((preference: OpenPreference = "selected") => {
        if (disabled) return

        const enabledValues = getEnabledValues()
        let nextActiveValue: string | undefined

        if (preference === "last") {
            nextActiveValue = enabledValues.at(-1)
        } else if (preference === "first") {
            nextActiveValue = enabledValues[0]
        } else {
            nextActiveValue = enabledValues.includes(value) ? value : enabledValues[0]
        }

        setActiveValue(nextActiveValue ?? null)
        setOpen(true)
    }, [disabled, getEnabledValues, value])

    const closeSelect = React.useCallback((returnFocus = false) => {
        setOpen(false)
        if (returnFocus) triggerRef.current?.focus()
    }, [])

    const moveActive = React.useCallback((direction: MoveDirection) => {
        const enabledValues = getEnabledValues()
        if (enabledValues.length === 0) {
            setActiveValue(null)
            return
        }

        if (direction === "first") {
            setActiveValue(enabledValues[0])
            return
        }

        if (direction === "last") {
            setActiveValue(enabledValues[enabledValues.length - 1])
            return
        }

        setActiveValue((current) => {
            const currentIndex = enabledValues.indexOf(current ?? value)
            if (currentIndex === -1) {
                return direction === 1 ? enabledValues[0] : enabledValues[enabledValues.length - 1]
            }

            return enabledValues[(currentIndex + direction + enabledValues.length) % enabledValues.length]
        })
    }, [getEnabledValues, value])

    const selectValue = React.useCallback((nextValue: string) => {
        if (disabled || optionsRef.current.get(nextValue)?.disabled) return

        if (!isControlled) setUncontrolledValue(nextValue)
        onValueChange?.(nextValue)
        setOpen(false)
        triggerRef.current?.focus()
    }, [disabled, isControlled, onValueChange])

    React.useEffect(() => {
        if (disabled) setOpen(false)
    }, [disabled])

    const activeOptionId = activeValue ? options.get(activeValue)?.id : undefined

    return (
        <SelectContext.Provider value={{
            value,
            disabled,
            open,
            activeValue,
            activeOptionId,
            options,
            triggerId,
            contentId,
            triggerRef,
            contentRef,
            openSelect,
            closeSelect,
            moveActive,
            selectValue,
            setActiveValue,
            registerOption,
        }}>
            <div className={cn("relative", className)} data-disabled={disabled || undefined}>
                {children}
            </div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(({
    children,
    className,
    disabled,
    id,
    onClick,
    onKeyDown,
    ...props
}, forwardedRef) => {
    const context = useSelectContext("SelectTrigger")
    const isDisabled = context.disabled || disabled

    const setTriggerRef = React.useCallback((node: HTMLButtonElement | null) => {
        context.triggerRef.current = node

        if (typeof forwardedRef === "function") {
            forwardedRef(node)
        } else if (forwardedRef) {
            forwardedRef.current = node
        }
    }, [context.triggerRef, forwardedRef])

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented || isDisabled) return

        if (context.open) {
            context.closeSelect()
        } else {
            context.openSelect("selected")
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || isDisabled) return

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault()
                context.open ? context.moveActive(1) : context.openSelect("selected")
                break
            case "ArrowUp":
                event.preventDefault()
                context.open ? context.moveActive(-1) : context.openSelect("last")
                break
            case "Home":
                event.preventDefault()
                context.open ? context.moveActive("first") : context.openSelect("first")
                break
            case "End":
                event.preventDefault()
                context.open ? context.moveActive("last") : context.openSelect("last")
                break
            case "Enter":
            case " ":
                event.preventDefault()
                if (context.open && context.activeValue) {
                    context.selectValue(context.activeValue)
                } else {
                    context.openSelect("selected")
                }
                break
            case "Escape":
                if (context.open) {
                    event.preventDefault()
                    event.stopPropagation()
                    context.closeSelect(true)
                }
                break
            case "Tab":
                if (context.open) context.closeSelect()
                break
        }
    }

    return (
        <button
            {...props}
            ref={setTriggerRef}
            id={id ?? context.triggerId}
            type="button"
            role="combobox"
            aria-autocomplete="none"
            aria-controls={context.contentId}
            aria-expanded={context.open}
            aria-haspopup="listbox"
            aria-activedescendant={context.open ? context.activeOptionId : undefined}
            disabled={isDisabled}
            data-state={context.open ? "open" : "closed"}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
                "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition-colors focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500",
                className
            )}
        >
            <span className="min-w-0 flex-1 truncate">{children}</span>
            <ChevronDown
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", context.open && "rotate-180")}
            />
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
    placeholder?: React.ReactNode
}

const SelectValue = ({ placeholder, className, ...props }: SelectValueProps) => {
    const context = useSelectContext("SelectValue")
    const displayValue = context.options.get(context.value)?.label
    const hasValue = context.value !== "" && displayValue !== undefined

    return (
        <span
            {...props}
            className={cn(!hasValue && "text-gray-500 dark:text-gray-400", className)}
        >
            {hasValue ? displayValue : placeholder}
        </span>
    )
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectContent = ({ children, className, style, ...props }: SelectContentProps) => {
    const context = useSelectContext("SelectContent")
    const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })
    const {
        activeOptionId,
        closeSelect,
        contentId,
        contentRef,
        open,
        triggerId,
        triggerRef,
    } = context

    React.useLayoutEffect(() => {
        if (!open) return

        const updatePosition = () => {
            const trigger = triggerRef.current
            if (!trigger) return

            const rect = trigger.getBoundingClientRect()
            setPosition({
                top: rect.bottom + 4,
                left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
                width: rect.width,
            })
        }

        updatePosition()
        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition, true)

        return () => {
            window.removeEventListener("resize", updatePosition)
            window.removeEventListener("scroll", updatePosition, true)
        }
    }, [open, triggerRef])

    React.useEffect(() => {
        if (!open) return

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node
            if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return
            closeSelect()
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return
            event.preventDefault()
            closeSelect(true)
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleEscape)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleEscape)
        }
    }, [closeSelect, contentRef, open, triggerRef])

    React.useEffect(() => {
        if (!open || !activeOptionId) return
        document.getElementById(activeOptionId)?.scrollIntoView?.({ block: "nearest" })
    }, [activeOptionId, open])

    if (typeof document === "undefined") return null

    return createPortal(
        <div
            {...props}
            ref={contentRef}
            id={contentId}
            role="listbox"
            aria-labelledby={triggerId}
            hidden={!open}
            data-state={open ? "open" : "closed"}
            className={cn(
                "fixed z-[9999] max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-xl outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
                className
            )}
            style={{
                top: position.top,
                left: position.left,
                width: position.width,
                minWidth: "8rem",
                ...style,
            }}
        >
            {children}
        </div>,
        document.body
    )
}

const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(getTextContent).join("")
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
        return getTextContent(node.props.children)
    }
    return ""
}

interface SelectItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
    value: string
    disabled?: boolean
    textValue?: string
}

const SelectItem = ({
    children,
    value,
    disabled = false,
    textValue,
    className,
    onClick,
    onMouseEnter,
    onPointerDown,
    ...props
}: SelectItemProps) => {
    const context = useSelectContext("SelectItem")
    const generatedId = React.useId().replace(/:/g, "")
    const optionId = `select-option-${generatedId}`
    const label = (textValue ?? getTextContent(children)) || value
    const isSelected = context.value === value
    const isActive = context.activeValue === value
    const isDisabled = context.disabled || disabled
    const { registerOption } = context

    React.useEffect(() => registerOption({
        value,
        label,
        id: optionId,
        disabled: isDisabled,
    }), [isDisabled, label, optionId, registerOption, value])

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event)
        if (event.defaultPrevented || isDisabled) return
        context.selectValue(value)
    }

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(event)
        if (!event.defaultPrevented && !isDisabled) context.setActiveValue(value)
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        onPointerDown?.(event)
        if (!event.defaultPrevented && !isDisabled) event.preventDefault()
    }

    return (
        <div
            {...props}
            id={optionId}
            role="option"
            aria-selected={isSelected}
            aria-disabled={isDisabled || undefined}
            data-value={value}
            tabIndex={-1}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onPointerDown={handlePointerDown}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
                isActive && !isDisabled && "bg-emerald-50 text-emerald-950 dark:bg-gray-700 dark:text-white",
                isSelected && "font-semibold",
                isDisabled && "cursor-not-allowed opacity-45",
                className
            )}
        >
            {children}
        </div>
    )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
