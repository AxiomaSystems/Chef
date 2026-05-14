type BadgeVariant = "primary" | "secondary" | "tertiary" | "outline" | "error";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  primary: "bg-[#f4be6b] text-[#351800]",
  secondary: "bg-[#f4be6b] text-[#073b3e]",
  tertiary: "bg-[#c0dedf]/30 text-[#073b3e]",
  outline: "border border-[#c0dedf] text-[#315f62] bg-white",
  error: "bg-[#ffdad6] text-[#93000a]",
};

export function Badge({
  children,
  variant = "secondary",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm uppercase tracking-wide
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
}
