/**
 * Error Handler Tests
 * 
 * Tests for utils/errorHandler.ts - centralized error handling
 */

import { Alert } from 'react-native';
import { ErrorHandler } from '../errorHandler';
import * as logger from '../logger';

// Mock dependencies
jest.mock('../logger');
jest.spyOn(Alert, 'alert');

const mockLogger = logger.logger as any;

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle Error object', () => {
      const error = new Error('Test error');
      ErrorHandler.handleError(error, 'User message');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User message',
        error,
        undefined
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'User message',
        [{ text: 'OK' }]
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      ErrorHandler.handleError(error, 'User message');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'User message',
        [{ text: 'OK' }]
      );
    });

    it('should use default message when userMessage not provided', () => {
      const error = new Error('Test error');
      ErrorHandler.handleError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.any(String), // Uses ERROR_MESSAGES.FILL_ALL_FIELDS as fallback
        [{ text: 'OK' }]
      );
    });

    it('should include context in error log', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      ErrorHandler.handleError(error, 'User message', context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User message',
        expect.any(Error),
        context
      );
    });

    it('should show retry button when onRetry provided', () => {
      const error = new Error('Test error');
      const onRetry = jest.fn();
      ErrorHandler.handleError(error, 'User message', undefined, onRetry);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'User message',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: onRetry }
        ]
      );
    });

    it('should call retry function when retry button pressed', () => {
      const error = new Error('Test error');
      const onRetry = jest.fn();
      ErrorHandler.handleError(error, 'User message', undefined, onRetry);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const retryButton = alertCall[2][1];
      retryButton.onPress();

      expect(onRetry).toHaveBeenCalled();
    });

    it('should handle null error', () => {
      ErrorHandler.handleError(null, 'User message');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle undefined error', () => {
      ErrorHandler.handleError(undefined, 'User message');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('handleAsyncError', () => {
    it('should handle async errors', () => {
      const error = new Error('Async error');
      ErrorHandler.handleAsyncError(error, 'Async operation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Async operation failed',
        error,
        undefined
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Async operation failed',
        [{ text: 'OK' }]
      );
    });

    it('should include context', () => {
      const error = new Error('Async error');
      const context = { operation: 'save', userId: '123' };
      ErrorHandler.handleAsyncError(error, 'Async operation failed', undefined, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Async operation failed',
        expect.any(Error),
        context
      );
    });

    it('should show retry button when onRetry provided', () => {
      const error = new Error('Async error');
      const onRetry = jest.fn();
      ErrorHandler.handleAsyncError(error, 'Async operation failed', onRetry);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Async operation failed',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: onRetry }
        ]
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String async error';
      ErrorHandler.handleAsyncError(error, 'Async operation failed');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors', () => {
      ErrorHandler.handleValidationError('email', 'Invalid email format');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Validation error: email',
        { field: 'email', message: 'Invalid email format' }
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Invalid email format'
      );
    });

    it('should handle different field names', () => {
      ErrorHandler.handleValidationError('password', 'Password too short');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Validation error: password',
        { field: 'password', message: 'Password too short' }
      );
    });
  });

  describe('handleNetworkError', () => {
    it('should handle network errors', () => {
      const error = new Error('Network error');
      ErrorHandler.handleNetworkError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Network error',
        error,
        undefined
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Error',
        'Unable to connect. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    });

    it('should include context', () => {
      const error = new Error('Network error');
      const context = { endpoint: '/api/users', method: 'GET' };
      ErrorHandler.handleNetworkError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Network error',
        error,
        context
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String network error';
      ErrorHandler.handleNetworkError(error);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('handleStorageError', () => {
    it('should handle storage errors', () => {
      const error = new Error('Storage error');
      ErrorHandler.handleStorageError(error, 'save profile');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Storage error during save profile',
        error,
        undefined
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Storage Error',
        'Failed to save profile. Please try again.',
        [{ text: 'OK' }]
      );
    });

    it('should include context', () => {
      const error = new Error('Storage error');
      const context = { key: 'profile', operation: 'write' };
      ErrorHandler.handleStorageError(error, 'save profile', context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Storage error during save profile',
        error,
        context
      );
    });

    it('should show retry button when onRetry provided', () => {
      const error = new Error('Storage error');
      const onRetry = jest.fn();
      ErrorHandler.handleStorageError(error, 'save profile', undefined, onRetry);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Storage Error',
        'Failed to save profile. Please try again.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: onRetry }
        ]
      );
    });

    it('should handle different operations', () => {
      const error = new Error('Storage error');
      ErrorHandler.handleStorageError(error, 'load data');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Storage Error',
        'Failed to load data. Please try again.',
        [{ text: 'OK' }]
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String storage error';
      ErrorHandler.handleStorageError(error, 'save profile');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty error message', () => {
      const error = new Error('');
      ErrorHandler.handleError(error, 'User message');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new Error(longMessage);
      ErrorHandler.handleError(error, 'User message');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle multiple rapid error calls', () => {
      const error = new Error('Test error');
      ErrorHandler.handleError(error, 'Error 1');
      ErrorHandler.handleError(error, 'Error 2');
      ErrorHandler.handleError(error, 'Error 3');

      expect(Alert.alert).toHaveBeenCalledTimes(3);
    });

    it('should handle complex context objects', () => {
      const error = new Error('Test error');
      const context = {
        nested: {
          deep: {
            value: 'test'
          }
        },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };
      ErrorHandler.handleError(error, 'User message', context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User message',
        expect.any(Error),
        context
      );
    });
  });
});
