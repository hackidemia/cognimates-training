/**
 * Error handling middleware
 * 
 * Centralizes error handling for the application with consistent formatting
 */

/**
 * Custom API error with status code and optional details
 */
class ApiError extends Error {
  /**
   * Create a new API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} [details] - Additional error details
   */
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handler for 404 (Not Found) errors
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(`Resource not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler for the application
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default values
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Set locals for template rendering
  res.locals.message = message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  // Determine response format
  const isApiRequest = req.xhr || req.headers.accept?.includes('application/json');
  
  // Log error details (not visible to client)
  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  
  // Send response in appropriate format
  if (isApiRequest) {
    const errorResponse = {
      status: 'error',
      statusCode,
      message
    };
    
    // Include error details in development mode
    if (req.app.get('env') === 'development' && err.details) {
      errorResponse.details = err.details;
    }
    
    return res.status(statusCode).json(errorResponse);
  }
  
  // Render error page for browser requests
  res.status(statusCode);
  res.render('error', {
    message,
    error: res.locals.error,
    title: `Error ${statusCode}`
  });
};

/**
 * Validation error handler for express-validator
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const validationErrorHandler = (req, res, next) => {
  const { validationErrors } = req;
  if (validationErrors && validationErrors.length > 0) {
    const error = new ApiError('Validation Error', 400, { validationErrors });
    return next(error);
  }
  next();
};

module.exports = {
  ApiError,
  notFoundHandler,
  globalErrorHandler,
  validationErrorHandler
};
