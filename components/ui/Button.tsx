"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-mustard text-ink hover:bg-[#e2b24f]",
  outline: "border border-cream/25 text-cream hover:border-cream/60 hover:bg-cream/5",
  ghost: "text-cream/70 hover:text-cream hover:bg-cream/5",
  danger: "border border-danger/60 text-danger hover:bg-danger/10",
};

interface Props extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  loading?: boolean;
  size?: "md" | "lg" | "sm";
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", loading, size = "md", className = "", children, disabled, ...rest },
  ref,
) {
  const sz = size === "lg" ? "min-h-14 px-5 text-sm min-[400px]:px-7 min-[400px]:text-base" : size === "sm" ? "min-h-10 px-4 text-xs" : "min-h-12 px-5 text-sm";
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97, y: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 font-bold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="animate-spin" size={16} aria-hidden />}
      {children}
    </motion.button>
  );
});
