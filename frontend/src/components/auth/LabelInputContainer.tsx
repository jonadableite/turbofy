"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LabelInputContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const LabelInputContainer = ({
  children,
  className,
}: LabelInputContainerProps) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};

