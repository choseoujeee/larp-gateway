import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Zachytí chyby v potomcích a zobrazí fallback místo bílé stránky */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
            <h2 className="mb-2 font-typewriter text-lg font-semibold text-destructive">
              Chyba na stránce
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {this.state.error.message}
            </p>
            <pre className="mb-4 max-h-32 overflow-auto rounded bg-muted p-2 text-left text-xs">
              {this.state.error.stack}
            </pre>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.assign("/admin/cp")}
            >
              Zpět na přehled CP
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
