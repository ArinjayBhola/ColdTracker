"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import dynamic from "next/dynamic"
const Calendar = dynamic(() => import("@/components/ui/calendar").then(module => module.Calendar), { loading: () => <div className="h-72 w-72 animate-pulse rounded-xl bg-muted" aria-label="Loading calendar" /> })
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    name?: string
    id?: string
    displayFormat?: string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, name, id, displayFormat = "PPP" }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined)
  const [open, setOpen] = React.useState(false)
  const [manualDate, setManualDate] = React.useState("")
  const [manualError, setManualError] = React.useState("")
  const manualId = React.useId()

  const applyManualDate = () => {
    const text = manualDate.trim()
    if (!text) { handleSelect(undefined); return }
    const parsed = parse(text, "dd/MM/yyyy", new Date())
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(text) || !isValid(parsed) || format(parsed, "dd/MM/yyyy") !== text) {
      setManualError("Enter a valid date as DD/MM/YYYY")
      return
    }
    handleSelect(parsed)
  }

  const timestamp = value?.getTime()
  React.useEffect(() => {
    setDate(timestamp === undefined ? undefined : new Date(timestamp))
  }, [timestamp])

  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    if (onChange) {
        onChange(newDate)
    }
    setOpen(false) // Close popover on selection
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <input type="hidden" name={name} value={date && !isNaN(date.getTime()) ? date.toISOString() : ""} />
      <Popover open={open} onOpenChange={nextOpen => {
        setOpen(nextOpen)
        if (nextOpen) {
          setManualDate(date && isValid(date) ? format(date, "dd/MM/yyyy") : "")
          setManualError("")
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-semibold h-11 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all group shadow-sm",
              !date && "text-muted-foreground font-normal"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            {date && !isNaN(date.getTime()) ? format(date, displayFormat) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[180] w-auto max-w-[calc(100vw-1rem)] p-0 rounded-2xl border-border/50 bg-card/95 backdrop-blur-2xl shadow-premium animate-in zoom-in-95 duration-200" align="start">
          <div className="space-y-2 border-b border-border/20 p-3">
            <label htmlFor={manualId} className="text-xs font-medium text-muted-foreground">Enter date (DD/MM/YYYY)</label>
            <div className="flex items-center gap-2">
              <Input id={manualId} value={manualDate} placeholder="DD/MM/YYYY" maxLength={10}
                className="h-9 min-w-0 flex-1" aria-invalid={!!manualError} aria-describedby={manualError ? `${manualId}-error` : undefined}
                onChange={event => { setManualDate(event.target.value); setManualError("") }}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); applyManualDate() } }} />
              <Button type="button" size="sm" className="h-9" onClick={applyManualDate}>Apply</Button>
            </div>
            {manualError && <p id={`${manualId}-error`} role="alert" className="text-xs text-destructive">{manualError}</p>}
          </div>
          {open && <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={handleSelect}
            initialFocus
            startMonth={new Date(new Date().getFullYear() - 100, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
          />}
          <div className="flex items-center justify-between p-3 border-t border-border/20 bg-muted/30 rounded-b-2xl">
            <Button
                type="button"
                variant="ghost" 
                size="sm" 
                className="text-primary hover:bg-primary/20 font-extrabold px-5 rounded-lg transition-all active:scale-95"
                onClick={() => {
                  const today = new Date();
                  handleSelect(today);
                }}
            >
                Today
            </Button>
            <Button
                type="button"
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 font-bold px-5 rounded-lg transition-all"
                onClick={() => handleSelect(undefined)}
            >
                Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
