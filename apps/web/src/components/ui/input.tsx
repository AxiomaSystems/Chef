import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: string;
}

export function Input({
  label,
  hint,
  error,
  icon,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label-lg text-[#315f62]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5f8689] text-[20px]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-[#fff2e3] border border-[#c0dedf]/50 rounded-xl px-4 py-3
            text-body-md text-[#132326] placeholder:text-[#5f8689]
            focus:outline-none focus:ring-2 focus:ring-[#f4790d]/30 focus:border-[#f4790d]
            transition-all
            ${icon ? "pl-10" : ""}
            ${error ? "border-[#ba1a1a] focus:ring-[#ba1a1a]/30" : ""}
            ${className}
          `}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-body-sm text-[#5f8689]">{hint}</p>}
      {error && <p className="text-body-sm text-[#ba1a1a]">{error}</p>}
    </div>
  );
}
