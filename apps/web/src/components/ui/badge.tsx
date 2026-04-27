type BadgeVariant = "primary" | "secondary" | "tertiary" | "outline" | "error";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  primary:   "bg-[#ffb38e] text-[#7a4326]",
  secondary: "bg-[#efe3b3] text-[#6d643f]",
  tertiary:  "bg-[#fcb1b8]/30 text-[#794147]",
  outline:   "border border-[#d7c2b9] text-[#52443d] bg-white",
  error:     "bg-[#ffdad6] text-[#93000a]",
};

export function Badge({ children, variant = "secondary", className = "" }: BadgeProps) {
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
