/**
 * errorMiddleware.js
 *
 * Centralised error handling for the Express app.
 *
 * notFound    – catches requests that matched no route (404)
 * errorHandler – formats any thrown error into a consistent JSON response
 */

/**
 * Generates a 404 error for unmatched routes and passes it to errorHandler.
 */
function notFound(req, res, next) {
  const error = new Error(`Not found – ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Global error handler.
 * Express recognises a 4-argument middleware as an error handler.
 *
 * @param {Error}  err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;

  const payload = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  // Include stack trace only during development
  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = { notFound, errorHandler };
