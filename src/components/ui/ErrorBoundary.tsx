/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Graceful error handling with retry option
 * - Error reporting integration ready
 * - Customizable fallback UI
 * - Development mode error details
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call optional error handler (for error reporting services)
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
          showDetails={this.props.showDetails ?? import.meta.env.DEV}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// DEFAULT ERROR FALLBACK UI
// ============================================================================

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
  showDetails?: boolean;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
  showDetails = false,
}) => {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-8 text-center border-b border-red-100 dark:border-red-900/40">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
          </div>

          {/* Error details (development mode) */}
          {showDetails && error && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Bug className="w-4 h-4" />
                <span>Error Details</span>
              </div>
              <p className="text-sm font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
                {error.message || 'Unknown error'}
              </p>

              {errorInfo?.componentStack && (
                <button
                  onClick={() => setShowStack(!showStack)}
                  className="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline"
                >
                  {showStack ? 'Hide' : 'Show'} component stack
                </button>
              )}

              {showStack && errorInfo?.componentStack && (
                <pre className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-md overflow-auto max-h-48">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/app'}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          If this keeps happening, please{' '}
          <a
            href="mailto:support@lydellsecurity.com"
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE ERROR BOUNDARY
// ============================================================================

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({
  children,
  pageName = 'page',
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Failed to load {pageName}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              There was an error loading this page. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// ============================================================================
// COMPONENT ERROR BOUNDARY
// ============================================================================

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
}

export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  componentName = 'component',
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Failed to render {componentName}</span>
          </div>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300">
            This component encountered an error. Please refresh the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
