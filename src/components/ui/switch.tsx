"use client"

import * as React from "react"

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className = "", ...props }, ref) => {
    return (
      <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div className={`relative w-11 h-6 rounded-full transition-colors ${
          checked 
            ? 'bg-[#635bff]' 
            : 'bg-muted border border-border'
        } ${className}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white'
          }`} />
        </div>
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }