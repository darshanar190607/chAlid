import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-[#FF2D55] text-white shadow-lg shadow-pink-100 hover:bg-[#FF4D70] active:scale-95",
      secondary: "bg-[#FF6B35] text-white shadow-lg shadow-orange-100 hover:bg-[#FF8C42] active:scale-95",
      accent: "bg-[#FF6B35] text-white shadow-lg shadow-orange-100 hover:bg-[#FF8C42] active:scale-95",
      outline: "border-2 border-orange-100 text-[#FF6B35] hover:bg-orange-50 active:scale-95",
      ghost: "text-[#1A1A2E] hover:bg-black/5 active:scale-95",
    }
    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
      icon: "p-3",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
