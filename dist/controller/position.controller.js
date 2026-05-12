"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePosition = exports.updatePosition = exports.getPositionById = exports.getAllPositions = exports.createPosition = void 0;
const position_model_1 = require("../models/position.model");
const salary_model_1 = require("../models/salary.model");
const http_1 = require("../utils/http");
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid position ID.", 400);
    }
    return id;
};
// CREATE - Handle both new and existing salary
exports.createPosition = (0, http_1.asyncHandler)(async (req, res) => {
    const { department_id, position_name, salary_type, salary_amount, salary_id } = req.body;
    if (!department_id || !position_name || !salary_type) {
        throw new http_1.AppError("Department ID, position name, and salary type are required.", 400);
    }
    let finalSalaryId;
    // If salary_type is "new", create a new salary
    if (salary_type === "new") {
        if (!salary_amount) {
            throw new http_1.AppError("Salary amount is required for new salary.", 400);
        }
        const newSalary = await salary_model_1.SalaryModel.create({
            amount: String(salary_amount),
        });
        finalSalaryId = newSalary.salary_id;
    }
    // If salary_type is "existing", use provided salary_id
    else if (salary_type === "existing") {
        if (!salary_id) {
            throw new http_1.AppError("Salary ID is required for existing salary.", 400);
        }
        const existingSalary = await salary_model_1.SalaryModel.findById(salary_id);
        if (!existingSalary) {
            throw new http_1.AppError("Selected salary not found.", 404);
        }
        finalSalaryId = salary_id;
    }
    else {
        throw new http_1.AppError("Invalid salary type. Use 'new' or 'existing'.", 400);
    }
    // Check if position already exists in the department
    const existingPosition = await position_model_1.PositionModel.findByNameAndDepartment(position_name.trim(), department_id);
    if (existingPosition) {
        throw new http_1.AppError(`Position "${position_name}" already exists in this department.`, 409);
    }
    const position = await position_model_1.PositionModel.create({
        department_id,
        position_name: position_name.trim(),
        salary_id: finalSalaryId,
    });
    res.status(201).json({
        success: true,
        message: "Position created successfully.",
        data: position,
    });
});
// GET ALL
exports.getAllPositions = (0, http_1.asyncHandler)(async (_req, res) => {
    const positions = await position_model_1.PositionModel.findAll();
    res.status(200).json({
        success: true,
        message: "Positions retrieved successfully.",
        data: positions,
    });
});
// GET BY ID
exports.getPositionById = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const position = await position_model_1.PositionModel.findById(id);
    if (!position) {
        throw new http_1.AppError("Position not found.", 404);
    }
    res.status(200).json({
        success: true,
        message: "Position retrieved successfully.",
        data: position,
    });
});
// UPDATE
exports.updatePosition = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const { department_id, position_name, salary_id } = req.body;
    const existing = await position_model_1.PositionModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Position not found.", 404);
    }
    const updateData = {};
    if (department_id) {
        updateData.department_id = department_id;
    }
    if (position_name) {
        updateData.position_name = position_name.trim();
    }
    if (salary_id) {
        const salary = await salary_model_1.SalaryModel.findById(salary_id);
        if (!salary) {
            throw new http_1.AppError("Selected salary not found.", 404);
        }
        updateData.salary_id = salary_id;
    }
    const position = await position_model_1.PositionModel.updateById(id, updateData);
    res.status(200).json({
        success: true,
        message: "Position updated successfully.",
        data: position,
    });
});
// DELETE
exports.deletePosition = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await position_model_1.PositionModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Position not found.", 404);
    }
    await position_model_1.PositionModel.deleteById(id);
    res.status(200).json({
        success: true,
        message: "Position deleted successfully.",
    });
});
