import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

type AccessibleOtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export const AccessibleOtpInput = ({ value, onChange, length = 6, disabled = false }: AccessibleOtpInputProps) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => Array.from({ length }, (_, index) => value[index] ?? ""), [length, value]);

  const updateDigit = (index: number, raw: string) => {
    const nextDigit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = nextDigit;
    onChange(next.join("").slice(0, length));
    if (nextDigit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) next[index] = "";
      else if (index > 0) {
        next[index - 1] = "";
        refs.current[index - 1]?.focus();
      }
      onChange(next.join(""));
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length) - 1]?.focus();
  };

  return (
    <fieldset>
      <legend className="sr-only">Six-digit verification code</legend>
      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => { refs.current[index] = node; }}
            value={digit}
            disabled={disabled}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.currentTarget.select()}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Verification code digit ${index + 1} of ${length}`}
            className={cn(
              "h-12 w-10 rounded-xl border bg-background text-center font-mono text-xl font-semibold shadow-sm outline-none transition sm:h-14 sm:w-12",
              "focus:-translate-y-0.5 focus:border-primary focus:ring-4 focus:ring-primary/10",
              digit && "border-primary/50 bg-secondary/45",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
};
