interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({
  children,
  className = "",
  onClick,
  hoverable,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-[#c0dedf]/30
        shadow-[0_4px_20px_-4px_rgba(60,154,158,0.08)]
        ${hoverable ? "cursor-pointer hover:shadow-[0_8px_30px_-4px_rgba(60,154,158,0.14)] hover:-translate-y-0.5 transition-all duration-200" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
