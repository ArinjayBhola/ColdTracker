"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, name }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setDate(value)
  }, [value])

  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    if (onChange) {
        onChange(newDate)
    }
    setOpen(false) // Close popover on selection
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <input type="hidden" name={name} value={date ? date.toISOString() : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-semibold h-11 px-4 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all group shadow-sm",
              !date && "text-muted-foreground font-normal"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl border-border/50 bg-card/95 backdrop-blur-2xl shadow-premium animate-in zoom-in-95 duration-200" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
          />
          <div className="flex items-center justify-between p-3 border-t border-border/20 bg-muted/30 rounded-b-2xl">
            <Button 
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
