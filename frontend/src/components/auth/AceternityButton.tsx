"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { BottomGradient } from "./BottomGradient";
import { cn } from "@/lib/utils";

interface AceternityButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export const AceternityButton = ({
  children,
  variant = "primary",
  className,
  ...props
}: AceternityButtonProps) => {
  if (variant === "primary") {
    return (
      <button
        className={cn(
          "group/btn relative h-12 w-full rounded-md bg-gradient-to-br from-primary via-primary to-primary/80 font-medium text-primary-foreground shadow-[0px_1px_0px_0px_#ffffff20_inset,0px_-1px_0px_0px_#ffffff20_inset] hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300",
          className
        )}
        {...props}
      >
        {children}
        <BottomGradient />
      </button>
    );
  }

  return (
    <button
      className={cn(
        "group/btn shadow-input relative flex h-12 w-full items-center justify-center space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626] hover:bg-gray-100 dark:hover:bg-zinc-800",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
      <BottomGradient />
    </button>
  );
};

