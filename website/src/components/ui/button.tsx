import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:opacity-90 rounded-md px-4 min-h-11",
        ghost:
          "bg-transparent text-fg hover:bg-elevated rounded-md px-4 min-h-11",
        outline:
          "bg-transparent text-fg hairline hairline-hover rounded-md px-4 min-h-11",
        stamp:
          "bg-stamp text-stamp-fg hover:opacity-90 rounded-md px-4 min-h-11",
        subtle:
          "bg-elevated text-fg hover:bg-surface hairline rounded-md px-4 min-h-11",
      },
      size: {
        md: "text-sm",
        sm: "text-xs min-h-10 px-3",
        lg: "text-base min-h-12 px-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
