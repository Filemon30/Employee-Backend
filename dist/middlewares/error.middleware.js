"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const errorMiddleware = (error, _req, res, _next) => {
    const errAny = error;
    const isJsonSyntaxError = errAny instanceof SyntaxError &&
        "body" in errAny &&
        /JSON/i.test(errAny.message);
    // Handle Prisma unique constraint errors (P2002) and also raw messages
    const maybePrisma = errAny;
    const isP2002 = maybePrisma && maybePrisma.code === "P2002";
    // Collect possible target fields from meta or from raw message
    let targets = [];
    if (isP2002) {
        const metaTarget = maybePrisma.meta?.target;
        if (Array.isArray(metaTarget))
            targets = metaTarget.map(String);
        else if (typeof metaTarget === "string")
            targets = [metaTarget];
    }
    // If not available in meta, try to parse the raw message like:
    // "Unique constraint failed on the fields: (`amount`)"
    if (targets.length === 0 && typeof errAny?.message === "string") {
        const m = errAny.message.match(/Unique constraint failed on the fields:\s*\(([^)]+)\)/i);
        if (m && m[1]) {
            const inside = m[1].replace(/[`'"\s]/g, "");
            targets = inside.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }
    if (isP2002 || targets.length > 0) {
        let friendly = "Resource already exists.";
        const lowerTargets = targets.map((t) => t.toLowerCase());
        if (lowerTargets.includes("amount"))
            friendly = "Salary Amount already exists.";
        else if (lowerTargets.includes("position_name") || lowerTargets.includes("department_id"))
            friendly = "Position already exists in this department.";
        res.status(409).json({ success: false, message: friendly });
        return;
    }
    const maybeStatusCode = errAny?.statusCode;
    const statusCode = isJsonSyntaxError
        ? 400
        : typeof maybeStatusCode === "number"
            ? maybeStatusCode
            : 500;
    const message = isJsonSyntaxError
        ? "Invalid JSON payload."
        : errAny?.message || "Internal server error.";
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.errorMiddleware = errorMiddleware;
