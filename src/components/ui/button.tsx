import { forwardRef, type ComponentProps } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "soft" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-active text-active-fg hover:opacity-90",
  dark: "bg-active text-active-fg hover:opacity-90",
  accent: "bg-accent text-accent-fg hover:brightness-105",
  soft: "bg-card-2 text-ink hover:bg-sunken",
  ghost: "bg-transparent text-ink-2 hover:bg-card-2",
  danger: "bg-danger text-white hover:brightness-105",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "soft", size = "md", icon: Icon, loading, disabled, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control font-medium transition select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        Icon && <Icon aria-hidden className="size-4" strokeWidth={1.8} />
      )}
      {children}
    </button>
  );
});

type IconButtonProps = Omit<ComponentProps<"button">, "children"> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  badge?: boolean;
};

const iconSizes = { sm: "size-8 rounded-[10px]", md: "size-10 rounded-control", lg: "size-12 rounded-[14px]" };

export function IconButton({ icon: Icon, label, active, size = "md", badge, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "relative grid shrink-0 place-items-center transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
        iconSizes[size],
        active ? "bg-active text-active-fg" : "bg-card-2 text-ink-2 hover:bg-sunken",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className={size === "sm" ? "size-4" : "size-[18px]"} strokeWidth={1.6} />
      {badge && <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-card-2" />}
    </button>
  );
}
