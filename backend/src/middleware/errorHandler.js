const { validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed.",
      details: result.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

function notFound(req, res) {
  res.status(404).json({ error: "Not found." });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[error] ${req.method} ${req.originalUrl} —`, err.message);
  if (process.env.NODE_ENV !== "production") console.error(err.stack);

  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong. Please try again." : err.message;
  res.status(status).json({ error: message });
}

module.exports = { handleValidation, notFound, errorHandler };
