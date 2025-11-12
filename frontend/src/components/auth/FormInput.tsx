"use client";

import { forwardRef, useState, InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LabelInputContainer } from "./LabelInputContainer";
import { cn } from "@/lib/utils";

export interface FormInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, type, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;
    const inputId = id || `input-${label.toLowerCase().replace(/\s/g, "-")}`;
    const errorId = `${inputId}-error`;

    return (
      <LabelInputContainer className={cn(error && "mb-4", className)}>
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          <Input
            ref={ref}
            type={inputType}
            id={inputId}
            className={cn(
              "h-12 bg-input/50 backdrop-blur-sm",
              error && "focus-visible:ring-destructive",
              isPassword && "pr-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </LabelInputContainer>
    );
  }
);

FormInput.displayName = "FormInput";

