import { Link } from "react-router-dom";
import { FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = true }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="no-print border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-typewriter text-xl tracking-wider text-foreground">
                LARP PORTÁL
              </h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">
                Tajné dokumenty
              </p>
            </div>
          </Link>

          {showAuth && (
            <nav className="flex items-center gap-4">
              {user ? (
                <>
                  <Link to="/admin">
                    <Button variant="outline" size="sm">
                      Administrace
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={signOut}
                    className="text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Odhlásit
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Přihlášení
                  </Button>
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
