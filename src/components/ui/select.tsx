import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SelectProps = ComponentProps<"select"> & { label: string; hideLabel?: boolean; wrapperClassName?: string };

/** Dropdown native bergaya pill (pengganti "Sector" di referensi). */
export function Select({ label, hideLabel = true, className, wrapperClassName, children, id, ...props }: SelectProps) {
  return (
    <label className={cn("relative inline-flex items-center gap-2", wrapperClassName)} htmlFor={id}>
      <span className={cn("text-sm text-muted", hideLabel && "sr-only")}>{label}</span>
      <span className="relative">
        <select
          id={id}
          className={cn(
            "h-10 min-w-32 cursor-pointer appearance-none rounded-control bg-card pr-9 pl-3.5 text-sm font-medium text-ink ring-1 ring-line transition outline-none hover:bg-card-2 focus-visible:ring-2 focus-visible:ring-accent",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2" strokeWidth={1.8} />
      </span>
    </label>
  );
}
