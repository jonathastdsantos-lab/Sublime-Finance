import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('permissions')) {
            isPermissionError = true;
            errorMessage = `Erro de permissão no Firestore (${parsed.operationType} em ${parsed.path}). Por favor, verifique se você tem acesso a esses dados.`;
          }
        }
      } catch (e) {
        // Not a JSON error message, use default or raw message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-display text-zinc-900">Ops! Algo deu errado</h1>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-sublime text-white px-6 py-3 rounded-xl font-bold hover:bg-sublime-dark transition-all shadow-lg shadow-sublime/20"
            >
              <RefreshCcw size={18} />
              Recarregar Aplicativo
            </button>
            {isPermissionError && (
              <p className="text-[10px] text-zinc-400">
                Se o erro persistir, pode ser necessário ajustar as regras de segurança do banco de dados.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
