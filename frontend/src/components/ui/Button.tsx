import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 ease-in-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer relative",
  {
    variants: {
      variant: {
        default:
          "bg-gray-900 text-white shadow-sm hover:bg-gray-800 focus-visible:ring-gray-900 border-0 hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
        primary:
          "bg-gray-900 text-white shadow-sm hover:bg-gray-800 focus-visible:ring-gray-900 border-0 hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600 border-0 hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-gray-300 bg-white shadow-sm hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 focus-visible:ring-gray-900 transform hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-900 transform hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 border-0 focus-visible:ring-gray-900",
        link: "text-gray-900 underline-offset-4 hover:underline",
        action: "bg-transparent border-none text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-1 rounded transition-colors duration-200",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-sm",
        lg: "h-12 rounded-md px-6 has-[>svg]:px-4 text-base font-medium",
        icon: "size-9",
      },
      loading: {
        true: "text-transparent",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
      loading?: boolean
    }
>(({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, loading: false, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, loading, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
      {children}
    </Comp>
  )
})

Button.displayName = "Button"

export { Button, buttonVariants }
