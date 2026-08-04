'use client';

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log the error to our logger service
    logger.error('ErrorBoundary caught an error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
    });
  }

  public resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="p-6 bg-red-50 border-l-4 border-red-400 mb-6 max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-700 mb-4">
            {this.state.error.message}
          </p>
          <details className="mt-4 space-y-2">
            <summary className="cursor-pointer font-medium text-red-600">
              Technical details
            </summary>
            <div className="text-sm text-red-500 bg-white p-3 rounded border border-red-200">
              <p><strong>Error:</strong> {this.state.error.name}: {this.state.error.message}</p>
              {this.state.error.stack && (
                <>
                  <p><strong>Stack trace:</strong></p>
                  <pre className="overflow-auto max-h-48">{this.state.error.stack}</pre>
                </>
              )}
              {this.state.errorInfo?.componentStack && (
                <>
                  <p><strong>Component stack:</strong></p>
                  <pre className="overflow-auto max-h-48">{this.state.errorInfo?.componentStack}</pre>
                </>
              )}
            </div>
          </details>
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Try again
            </button>
            <button
              onClick={() => {
                // In a real app, you might send this to an error reporting service
                alert('Error reported to development team (simulated)');
              }}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
            >
              Report error
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;