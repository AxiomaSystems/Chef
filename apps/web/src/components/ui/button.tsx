import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[#f4790d] text-white hover:bg-[#351800] active:scale-[0.98]",
  secondary:
    "bg-[#f4be6b] text-[#351800] hover:bg-[#fff2e3] active:scale-[0.98]",
  ghost: "bg-transparent text-[#f4790d] hover:bg-[#fff2e3] active:scale-[0.98]",
  outline:
    "bg-white border border-[#f4790d] text-[#f4790d] hover:bg-[#fff2e3] active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-label-md",
  md: "px-6 py-3 text-label-lg",
  lg: "px-8 py-4 text-label-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  fullWidth,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-full font-semibold
        transition-all duration-200 shadow-sm disabled:opacity-50 disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {icon && iconPosition === "left" && (
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      )}
      {children}
      {icon && iconPosition === "right" && (
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      )}
    </button>
  );
}
