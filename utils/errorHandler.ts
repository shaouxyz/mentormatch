// Centralized Error Handling
// Provides consistent error handling and user-friendly error messages

import { Alert } from 'react-native';
import { logger } from './logger';
import { ERROR_MESSAGES } from './constants';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  context?: Record<string, unknown>;
}

export class ErrorHandler {
  /**
   * Handle errors consistently across the app
   */
  static handleError(
    error: unknown, 
    userMessage?: string, 
    context?: Record<string, unknown>,
    onRetry?: () => void
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Log error for debugging
    logger.error(
      userMessage || 'An unexpected error occurred',
      errorObj,
      context
    );

    // Show user-friendly message with optional retry
    const buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [{ text: 'OK' }];
    if (onRetry) {
      buttons.push({ text: 'Retry', onPress: onRetry });
    }

    Alert.alert(
      'Error',
      userMessage || ERROR_MESSAGES.FILL_ALL_FIELDS, // Fallback message
      buttons
    );
  }

  /**
   * Handle async operation errors with retry option
   */
  static handleAsyncError(
    error: unknown,
    userMessage: string,
    onRetry?: () => void,
    context?: Record<string, unknown>
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    logger.error(userMessage, errorObj, context);

    const buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [{ text: 'OK' }];
    if (onRetry) {
      buttons.push({ text: 'Retry', onPress: onRetry });
    }

    Alert.alert('Error', userMessage, buttons);
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, message: string): void {
    logger.warn(`Validation error: ${field}`, { field, message });
    Alert.alert('Validation Error', message);
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: unknown, context?: Record<string, unknown>): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Network error', errorObj, context);
    
    Alert.alert(
      'Connection Error',
      'Unable to connect. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Handle storage errors
   */
  static handleStorageError(
    error: unknown, 
    operation: string, 
    context?: Record<string, unknown>,
    onRetry?: () => void
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(`Storage error during ${operation}`, errorObj, context);
    
    const buttons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [{ text: 'OK' }];
    if (onRetry) {
      buttons.push({ text: 'Retry', onPress: onRetry });
    }
    
    Alert.alert(
      'Storage Error',
      `Failed to ${operation}. Please try again.`,
      buttons
    );
  }
}
