/**
 * Request validation middleware
 * 
 * Provides validation for incoming API requests
 */

const { validationResult } = require('express-validator');
const { ApiError } = require('./error-handlers');

/**
 * Validates the request using express-validator rules
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      param: error.param,
      message: error.msg,
      value: error.value
    }));
    
    throw new ApiError('Validation failed', 400, { validationErrors });
  }
  
  next();
};

module.exports = {
  validateRequest
};
