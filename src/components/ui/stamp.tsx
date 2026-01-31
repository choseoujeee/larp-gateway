import { cn } from "@/lib/utils";

interface StampProps {
  children: React.ReactNode;
  variant?: "red" | "primary" | "accent";
  className?: string;
  animated?: boolean;
}

export function Stamp({ 
  children, 
  variant = "red", 
  className,
  animated = false 
}: StampProps) {
  const variantClasses = {
    red: "text-destructive border-destructive",
    primary: "text-primary border-primary",
    accent: "text-accent border-accent",
  };

  return (
    <span
      className={cn(
        "inline-block px-3 py-1 font-typewriter font-bold uppercase tracking-wider",
        "border-3 border-current rounded-sm",
        "transform rotate-[-3deg]",
        "shadow-stamp",
        variantClasses[variant],
        animated && "animate-stamp",
        className
      )}
      style={{ borderWidth: "3px" }}
    >
      {children}
    </span>
  );
}
