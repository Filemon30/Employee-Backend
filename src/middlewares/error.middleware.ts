import { NextFunction, Request, Response } from "express";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  const isJsonSyntaxError =
    error instanceof SyntaxError &&
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
