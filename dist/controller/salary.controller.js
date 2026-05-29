"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalary = exports.updateSalary = exports.getSalaryById = exports.getAllSalaries = exports.createSalary = exports.asyncHandler = void 0;
const salary_model_1 = require("../models/salary.model");
const http_1 = require("../utils/http");
const activity_log_1 = require("../utils/activity-log");
// ✅ SAFE ASYNC HANDLER (FIXED TYPE ISSUE)
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!Number.isInteger(id) || id <= 0) {
        throw new http_1.AppError("Invalid salary ID.", 400);
    }
    return id;
};
// CREATE
exports.createSalary = (0, exports.asyncHandler)(async (req, res) => {
    const { amount } = req.body;
    const transactedBy = (0, activity_log_1.getTransactedById)(req);
    if (!amount) {
        throw new http_1.AppError("Salary amount is required.", 400);
    }
    const normalizedAmount = String(amount).trim().replace(/,/g, "");
    if (!normalizedAmount || isNaN(Number(normalizedAmount))) {
        throw new http_1.AppError("Invalid salary amount.", 400);
    }
    const salary = await salary_model_1.SalaryModel.createOrGet({
        amount: normalizedAmount,
    });
    await (0, activity_log_1.logCrudTransaction)({
        action: "Create",
        resource: "Salary",
        transactedBy,
        salary_id: salary.salary_id,
    });
    return res.status(201).json({
        success: true,
        message: "Salary created successfully.",
        data: salary,
    });
});
// GET ALL
exports.getAllSalaries = (0, exports.asyncHandler)(async (_req, res) => {
    const salaries = await salary_model_1.SalaryModel.findAll();
    return res.status(200).json({
        success: true,
        message: "Salaries retrieved successfully.",
        data: salaries,
    });
});
// GET BY ID
exports.getSalaryById = (0, exports.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const salary = await salary_model_1.SalaryModel.findById(id);
    if (!salary) {
        throw new http_1.AppError("Salary not found.", 404);
    }
    return res.status(200).json({
        success: true,
        message: "Salary retrieved successfully.",
        data: salary,
    });
});
// UPDATE
exports.updateSalary = (0, exports.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const { amount } = req.body;
    if (!amount) {
        throw new http_1.AppError("Salary amount is required.", 400);
    }
    const normalizedAmount = String(amount).trim().replace(/,/g, "");
    if (!normalizedAmount || isNaN(Number(normalizedAmount))) {
        throw new http_1.AppError("Invalid salary amount.", 400);
    }
    const salary = await salary_model_1.SalaryModel.updateById(id, {
        amount: normalizedAmount,
    });
    await (0, activity_log_1.logCrudTransaction)({
        action: "Update",
        resource: "Salary",
        transactedBy: (0, activity_log_1.getTransactedById)(req),
        salary_id: salary.salary_id,
    });
    return res.status(200).json({
        success: true,
        message: "Salary updated successfully.",
        data: salary,
    });
});
// DELETE
exports.deleteSalary = (0, exports.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    await salary_model_1.SalaryModel.deleteById(id);
    await (0, activity_log_1.logCrudTransaction)({
        action: "Delete",
        resource: "Salary",
        transactedBy: (0, activity_log_1.getTransactedById)(req),
        salary_id: id,
    });
    return res.status(200).json({
        success: true,
        message: "Salary deleted successfully.",
    });
});
