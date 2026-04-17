import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        critical:
          "border-transparent bg-red-600 text-white hover:bg-red-700 shadow-sm",
        high: "border-transparent bg-orange-500 text-white hover:bg-orange-600 shadow-sm",
        medium:
          "border-transparent bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm",
        low: "border-transparent bg-green-500 text-white hover:bg-green-600 shadow-sm",
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
