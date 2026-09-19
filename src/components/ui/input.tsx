import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-11 w-full rounded-control bg-card-2 px-3.5 text-[15px] text-ink ring-1 ring-line outline-none transition placeholder:text-muted focus:ring-2 focus:ring-accent disabled:opacity-60 aria-invalid:ring-2 aria-invalid:ring-danger";

type FieldProps = ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode; error?: string | null; suffix?: ReactNode };

/** Input berlabel dengan pesan error per field (dipetakan dari VALIDATION_ERROR backend). */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, suffix, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const msgId = `${inputId}-msg`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={cn(inputClass, suffix ? "pr-14" : undefined)}
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={msgId} className={cn("text-xs", error ? "text-danger-ink" : "text-muted")}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

type TextAreaProps = ComponentProps<"textarea"> & { label: ReactNode; error?: string | null };

export function TextAreaField({ label, error, className, id, ...props }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, "h-auto min-h-20 py-2.5")}
        {...props}
      />
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}

type SwitchProps = { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean };

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50",
        checked ? "bg-accent" : "bg-sunken",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}
