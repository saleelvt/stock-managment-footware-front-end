// Error Handling Service for Offline App
// Provides consistent error handling and user-friendly error messages

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  QUOTA_ERROR = 'QUOTA_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

class ErrorHandler {
  // Convert various error types to AppError
  static handleError(error: any, context?: string): AppError {
    console.error(`Error in ${context || 'unknown context'}:`, error);

    // Network errors
    if (!navigator.onLine) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: 'No internet connection',
        userMessage: 'You are currently offline. Please check your internet connection and try again.',
        details: error,
        timestamp: new Date(),
        recoverable: true
      };
    }

    // IndexedDB errors
    if (error?.name === 'InvalidStateError' || error?.name === 'TransactionInactiveError') {
      return {
        type: ErrorType.DATABASE_ERROR,
        message: 'Database transaction error',
        userMessage: 'A database error occurred. Please refresh the page and try again.',
        details: error,
        timestamp: new Date(),
        recoverable: true
      };
    }

    if (error?.name === 'ConstraintError') {
      return {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Data constraint violation',
        userMessage: 'This item already exists or the data is invalid. Please check your input.',
        details: error,
        timestamp: new Date(),
        recoverable: true
      };
    }

    if (error?.name === 'QuotaExceededError') {
      return {
        type: ErrorType.QUOTA_ERROR,
        message: 'Storage quota exceeded',
        userMessage: 'Not enough storage space available. Please clear some data or use a different browser.',
        details: error,
        timestamp: new Date(),
        recoverable: false
      };
    }

    if (error?.name === 'NotFoundError') {
      return {
        type: ErrorType.NOT_FOUND_ERROR,
        message: 'Item not found',
        userMessage: 'The requested item was not found. It may have been deleted.',
        details: error,
        timestamp: new Date(),
        recoverable: false
      };
    }

    // API errors (for future use)
    if (error?.response) {
      const status = error.response.status;
      if (status === 404) {
        return {
          type: ErrorType.NOT_FOUND_ERROR,
          message: `API endpoint not found: ${error.response.config?.url}`,
          userMessage: 'The requested service is currently unavailable. Please try again later.',
          details: error,
          timestamp: new Date(),
          recoverable: true
        };
      }

      if (status >= 500) {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: `Server error: ${status}`,
          userMessage: 'The server is experiencing issues. Please try again in a few moments.',
          details: error,
          timestamp: new Date(),
          recoverable: true
        };
      }

      if (status >= 400) {
        return {
          type: ErrorType.VALIDATION_ERROR,
          message: `Client error: ${status}`,
          userMessage: 'There was an issue with your request. Please check your input and try again.',
          details: error,
          timestamp: new Date(),
          recoverable: true
        };
      }
    }

    // Default error
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: error?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or refresh the page.',
      details: error,
      timestamp: new Date(),
      recoverable: true
    };
  }

  // Get user-friendly error message
  static getUserMessage(error: AppError): string {
    return error.userMessage;
  }

  // Check if error is recoverable
  static isRecoverable(error: AppError): boolean {
    return error.recoverable;
  }

  // Log error for debugging
  static logError(error: AppError, context?: string): void {
    const logData = {
      context: context || 'unknown',
      type: error.type,
      message: error.message,
      timestamp: error.timestamp,
      details: error.details
    };

    console.error('App Error:', logData);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }

  // Create success message
  static createSuccessMessage(action: string, item?: string): string {
    const itemName = item ? ` ${item}` : '';
    return `${action}${itemName} completed successfully.`;
  }

  // Create error message for specific operations
  static getOperationErrorMessage(operation: string, item?: string): string {
    const itemName = item ? ` ${item}` : ' item';
    return `Failed to ${operation}${itemName}. Please try again.`;
  }
}

// Error boundary helper for React components
export const withErrorHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = ErrorHandler.handleError(error, context);
      ErrorHandler.logError(appError, context);

      // Re-throw with user-friendly message
      const userError = new Error(appError.userMessage);
      (userError as any).originalError = error;
      (userError as any).appError = appError;

      throw userError;
    }
  };
};

// Hook for React components to handle errors
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    const appError = ErrorHandler.handleError(error, context);
    ErrorHandler.logError(appError, context);
    return appError;
  };

  return { handleError };
};

export default ErrorHandler;