"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const errorMiddleware = (error, _req, res, _next) => {
    const maybeStatusCode = error.statusCode;
    const isJsonSyntaxError = error instanceof SyntaxError &&
        "body" in error &&
        /JSON/i.test(error.message);
    const statusCode = isJsonSyntaxError
        ? 400
        : typeof maybeStatusCode === "number"
            ? maybeStatusCode
            : 500;
    const message = isJsonSyntaxError
        ? "Invalid JSON payload."
        : error.message || "Internal server error.";
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.errorMiddleware = errorMiddleware;
