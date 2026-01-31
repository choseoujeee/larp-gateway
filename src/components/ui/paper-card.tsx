import { cn } from "@/lib/utils";
import { ReactNode, MouseEventHandler } from "react";

export interface PaperCardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function PaperCard({ 
  children, 
  className, 
  as: Component = "div",
  onClick 
}: PaperCardProps) {
  return (
    <Component
      className={cn(
        "paper-card p-6",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface PaperCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function PaperCardHeader({ children, className }: PaperCardHeaderProps) {
  return (
    <div className={cn("mb-4 pb-4 border-b border-border", className)}>
      {children}
    </div>
  );
}

interface PaperCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function PaperCardTitle({ children, className }: PaperCardTitleProps) {
  return (
    <h2 className={cn("font-typewriter text-xl tracking-wide text-foreground", className)}>
      {children}
    </h2>
  );
}

interface PaperCardContentProps {
  children: ReactNode;
  className?: string;
}

export function PaperCardContent({ children, className }: PaperCardContentProps) {
  return (
    <div className={cn("text-foreground/90", className)}>
      {children}
    </div>
  );
}
