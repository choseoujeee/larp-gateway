import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Přepnout světlý/tmavý režim"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`
        relative flex items-center w-14 h-8 rounded-full shadow-sm border border-border
        transition-colors duration-300 cursor-pointer flex-shrink-0
        ${isDark ? "bg-slate-700" : "bg-amber-100"}
      `}
    >
      <div
        className={`
          absolute top-0.5 flex items-center justify-center w-7 h-7 rounded-full
          transition-all duration-300 ease-in-out shadow-md
          ${isDark
            ? "translate-x-6 bg-slate-900 text-blue-300"
            : "translate-x-0.5 bg-amber-400 text-amber-800"
          }
        `}
      >
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </div>
    </button>
  );
}
