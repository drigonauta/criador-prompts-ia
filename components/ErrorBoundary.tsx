import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
                    <div className="bg-red-900/50 p-6 rounded-lg border border-red-500 max-w-lg w-full">
                        <h2 className="text-2xl font-bold mb-4">Ops! Algo deu errado.</h2>
                        <p className="mb-4 text-slate-300">Ocorreu um erro ao carregar esta página.</p>
                        <div className="bg-black/50 p-4 rounded text-xs font-mono overflow-auto max-h-60">
                            {this.state.error?.toString()}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
