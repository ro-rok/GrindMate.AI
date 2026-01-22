import { Component } from 'react';
import ErrorState from './ui/ErrorState';

/**
 * ErrorBoundary Component
 * Catches React errors and displays a fallback UI
 * 
 * Features:
 * - Catches errors in child components
 * - Displays user-friendly error message
 * - Provides reset functionality
 * - Logs errors to console for debugging
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call optional reset callback from props
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--black-base)' }}
        >
          <div className="max-w-2xl w-full">
            <ErrorState
              title="Oops! Something went wrong"
              message={
                this.props.showDetails && this.state.error
                  ? this.state.error.toString()
                  : "We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists."
              }
              onRetry={this.handleReset}
              retryLabel="Try Again"
            />

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details 
                className="mt-6 p-4"
                style={{
                  backgroundColor: 'var(--black-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)'
                }}
              >
                <summary 
                  className="cursor-pointer font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Error Details (Development Only)
                </summary>
                <pre className="overflow-auto text-xs">
                  {this.state.error && this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
