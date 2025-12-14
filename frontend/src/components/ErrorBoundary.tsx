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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        }}>
          <h1 style={{ color: '#ef4444' }}>Oops! Something went wrong</h1>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f3f4f6',
            borderRadius: '5px',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              <strong>Debug Info:</strong>
            </p>
            <p style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>
              Demo Mode: {import.meta.env.VITE_DEMO_MODE}
            </p>
            <p style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>
              API URL: {import.meta.env.VITE_API_URL || 'not set'}
            </p>
            <p style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              Error: {this.state.error?.toString()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
