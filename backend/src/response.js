/**
 * utils/response.js
 *
 * Helpers to send consistent JSON responses.
 * Controllers should always use these instead of calling res.json() directly
 * so the response envelope stays uniform across the entire API.
 */

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {*}      options.data       – response payload
 * @param {string} [options.message]  – optional human-readable message
 * @param {number} [options.status]   – HTTP status code (default: 200)
 */
function sendSuccess(res, { data = null, message = "OK", status = 200 } = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response.
 * Prefer throwing errors and letting errorMiddleware handle them;
 * use this only when you need fine-grained control without throwing.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} [options.message]  – error description
 * @param {number} [options.status]   – HTTP status code (default: 500)
 */
function sendError(res, { message = "Something went wrong", status = 500 } = {}) {
  return res.status(status).json({
    success: false,
    message,
  });
}

module.exports = { sendSuccess, sendError };
