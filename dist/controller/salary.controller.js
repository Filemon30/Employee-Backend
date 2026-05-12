"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalary = exports.updateSalary = exports.getSalaryById = exports.getAllSalaries = exports.createSalary = void 0;
const salary_model_1 = require("../models/salary.model");
const http_1 = require("../utils/http");
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid salary ID.", 400);
    }
    return id;
};
// CREATE
exports.createSalary = (0, http_1.asyncHandler)(async (req, res) => {
    const { amount } = req.body;
    if (!amount) {
        throw new http_1.AppError("Salary amount is required.", 400);
    }
    const salary = await salary_model_1.SalaryModel.create({
        amount: String(amount),
    });
    res.status(201).json({
        success: true,
        message: "Salary created successfully.",
        data: salary,
    });
});
// GET ALL
exports.getAllSalaries = (0, http_1.asyncHandler)(async (_req, res) => {
    const salaries = await salary_model_1.SalaryModel.findAll();
    res.status(200).json({
        success: true,
        message: "Salaries retrieved successfully.",
        data: salaries,
    });
});
// GET BY ID
exports.getSalaryById = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const salary = await salary_model_1.SalaryModel.findById(id);
    if (!salary) {
        throw new http_1.AppError("Salary not found.", 404);
    }
    res.status(200).json({
        success: true,
        message: "Salary retrieved successfully.",
        data: salary,
    });
});
// UPDATE
exports.updateSalary = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const { amount } = req.body;
    const existing = await salary_model_1.SalaryModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Salary not found.", 404);
    }
    if (!amount) {
        throw new http_1.AppError("Salary amount is required.", 400);
    }
    const salary = await salary_model_1.SalaryModel.updateById(id, {
        amount: String(amount),
    });
    res.status(200).json({
        success: true,
        message: "Salary updated successfully.",
        data: salary,
    });
});
// DELETE
exports.deleteSalary = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await salary_model_1.SalaryModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Salary not found.", 404);
    }
    await salary_model_1.SalaryModel.deleteById(id);
    res.status(200).json({
        success: true,
        message: "Salary deleted successfully.",
    });
});
