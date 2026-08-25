import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-6 dark:bg-slate-950">
          <div className="glass max-w-md rounded-2xl p-8 text-center dark:bg-slate-900/60">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
              <AlertTriangle className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="mt-5 font-display text-xl font-bold text-ink-900 dark:text-white">
              Terjadi kesalahan (Something went wrong)
            </h2>
            <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
              Terjadi kesalahan yang tidak terduga. Silakan muat ulang halaman. (An unexpected error occurred. Please try refreshing the page.)
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700"
            >
              <RefreshCw className="h-4 w-4" /> Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
