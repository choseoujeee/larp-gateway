import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function FloatingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="fixed bottom-14 right-4 z-50 no-print">
      <Button
        variant="outline"
        size="sm"
        className="shadow-lg bg-background hover:bg-accent gap-2"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="hidden sm:inline">Vizuál</span>
      </Button>
    </div>
  );
}
