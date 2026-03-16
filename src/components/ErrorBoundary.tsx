import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = "Erro de Permissão ou Dados";
            details = parsed;
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-zinc-900">{errorMessage}</h1>
              <p className="text-sm text-zinc-500">
                Não foi possível processar sua solicitação. Tente recarregar a página.
              </p>
            </div>
            
            {details && (
              <div className="text-left bg-zinc-900 text-zinc-400 p-4 rounded-xl text-[10px] font-mono overflow-auto max-h-40">
                <pre>{JSON.stringify(details, null, 2)}</pre>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 bg-sublime text-white px-6 py-3 rounded-xl font-bold hover:bg-sublime-dark transition-all"
              >
                <RefreshCw size={18} />
                Recarregar
              </button>
              <button 
                onClick={async () => {
                  const { auth } = await import('../firebase');
                  await auth.signOut();
                  window.location.reload();
                }}
                className="flex-1 flex items-center justify-center gap-2 border border-zinc-200 text-zinc-600 px-6 py-3 rounded-xl font-bold hover:bg-zinc-50 transition-all"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.children;
  }
}
