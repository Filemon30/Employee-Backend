"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCrudTransaction = exports.getTransactedById = void 0;
const http_1 = require("./http");
const transaction_model_1 = require("../models/transaction.model");
const parseRequiredId = (rawId, fieldName) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError(`${fieldName} is required.`, 400);
    }
    return id;
};
const getTransactedById = (req) => {
    return parseRequiredId(req.body?.transacted_by ?? req.query.transacted_by ?? req.headers["x-transacted-by"], "transacted_by");
};
exports.getTransactedById = getTransactedById;
const logCrudTransaction = async (input) => {
    try {
        return await transaction_model_1.TransactionModel.create({
            transaction_type: `${input.resource} ${input.action}`,
            transacted_by: input.transactedBy,
            reference_type: input.resource,
            department_id: input.department_id,
            position_id: input.position_id,
            salary_id: input.salary_id,
            work_hour_id: input.work_hour_id,
            employee_id: input.employee_id,
        });
    }
    catch (error) {
        console.error("Failed to log transaction:", error);
        return null;
    }
};
exports.logCrudTransaction = logCrudTransaction;
