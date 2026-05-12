"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.getDepartmentById = exports.getAllDepartments = exports.createDepartment = void 0;
const department_model_1 = require("../models/department.model");
const employee_model_1 = require("../models/employee.model");
const position_model_1 = require("../models/position.model");
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid department ID.", 400);
    }
    return id;
};
const parseOptionalId = (rawId) => {
    if (rawId === undefined) {
        return undefined;
    }
    if (rawId === null || rawId === "") {
        return null;
    }
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid department head ID.", 400);
    }
    return id;
};
const ensureDepartmentHeadEmployeeMatchesDepartment = async (employeeId, departmentId) => {
    const headEmployee = await employee_model_1.EmployeeModel.findById(employeeId);
    if (!headEmployee) {
        throw new http_1.AppError("Department head employee not found.", 404);
    }
    if (!headEmployee.position_id) {
        throw new http_1.AppError("Department head employee must have a position assigned.", 400);
    }
    const employeePosition = await position_model_1.PositionModel.findById(headEmployee.position_id);
    if (!employeePosition || employeePosition.department_id !== departmentId) {
        throw new http_1.AppError("Department head employee must belong to a position in the same department.", 400);
    }
};
const assignEmployeeToManagerPosition = async (employeeId, departmentId) => {
    let managerPos = await position_model_1.PositionModel.findByNameAndDepartment("Manager", departmentId);
    if (!managerPos) {
        throw new http_1.AppError("Manager position not found for this department.", 404);
    }
    await employee_model_1.EmployeeModel.updateById(employeeId, { position_id: managerPos.position_id });
};
// CREATE
exports.createDepartment = (0, http_1.asyncHandler)(async (req, res) => {
    const { department_name, department_head } = req.body;
    if (!department_name) {
        throw new http_1.AppError("Department name is required.", 400);
    }
    const parsedDepartmentHead = parseOptionalId(department_head);
    if (typeof parsedDepartmentHead === "number") {
        const headEmployee = await employee_model_1.EmployeeModel.findById(parsedDepartmentHead);
        if (!headEmployee)
            throw new http_1.AppError("Department head not found.", 404);
    }
    const department = await department_model_1.DepartmentModel.create({
        department_name: department_name,
        department_head: parsedDepartmentHead ?? null,
    });
    // If a department head was provided, ensure they are assigned the Manager position
    if (typeof parsedDepartmentHead === "number") {
        await assignEmployeeToManagerPosition(parsedDepartmentHead, department.department_id);
    }
    res.status(201).json({
        success: true,
        message: "Department created successfully.",
        data: department,
    });
});
exports.getAllDepartments = (0, http_1.asyncHandler)(async (req, res) => {
    const departments = await department_model_1.DepartmentModel.findAll();
    res.status(200).json({
        success: true,
        message: "Departments retrieved successfully.",
        data: departments,
    });
});
exports.getDepartmentById = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const department = await department_model_1.DepartmentModel.findById(id);
    if (!department) {
        throw new http_1.AppError("Department not found.", 404);
    }
    res.status(200).json({
        success: true,
        message: "Department retrieved successfully.",
        data: department,
    });
});
exports.updateDepartment = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await department_model_1.DepartmentModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Department not found.", 404);
    }
    const updateData = {};
    if (req.body.department_name !== undefined) {
        updateData.department_name = req.body.department_name;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "department_head")) {
        const parsedDepartmentHead = parseOptionalId(req.body.department_head);
        if (typeof parsedDepartmentHead === "number") {
            const headEmployee = await employee_model_1.EmployeeModel.findById(parsedDepartmentHead);
            if (!headEmployee)
                throw new http_1.AppError("Department head not found.", 404);
            let managerPos = await position_model_1.PositionModel.findByNameAndDepartment("Manager", id);
            if (!managerPos) {
                throw new http_1.AppError("Manager position not found for this department.", 404);
            }
            // Build transaction steps: reset old head's position, assign new head to Manager, update department
            const transactionSteps = [];
            // If there's an existing head and it's different from the new head, reset old head's position to null
            if (existing.department_head && existing.department_head !== parsedDepartmentHead) {
                transactionSteps.push(db_1.prisma.employees.update({ where: { employee_id: existing.department_head }, data: { position_id: null } }));
            }
            // Update new head's position to Manager
            transactionSteps.push(db_1.prisma.employees.update({ where: { employee_id: parsedDepartmentHead }, data: { position_id: managerPos.position_id } }));
            // Update department head
            transactionSteps.push(db_1.prisma.departments.update({ where: { department_id: id }, data: { department_head: parsedDepartmentHead } }));
            // Execute transaction
            await db_1.prisma.$transaction(transactionSteps);
            const updated = await department_model_1.DepartmentModel.findById(id);
            res.status(200).json({
                success: true,
                message: "Department updated successfully.",
                data: updated,
            });
            return;
        }
        if (parsedDepartmentHead === null) {
            // If clearing the head, reset the old head's position to null
            const transactionSteps = [];
            if (existing.department_head) {
                transactionSteps.push(db_1.prisma.employees.update({ where: { employee_id: existing.department_head }, data: { position_id: null } }));
            }
            transactionSteps.push(db_1.prisma.departments.update({ where: { department_id: id }, data: { department_head: null } }));
            await db_1.prisma.$transaction(transactionSteps);
            const updated = await department_model_1.DepartmentModel.findById(id);
            res.status(200).json({
                success: true,
                message: "Department updated successfully.",
                data: updated,
            });
            return;
        }
    }
    const department = await department_model_1.DepartmentModel.updateById(id, updateData);
    res.status(200).json({
        success: true,
        message: "Department updated successfully.",
        data: department,
    });
});
exports.deleteDepartment = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await department_model_1.DepartmentModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Department not found.", 404);
    }
    await department_model_1.DepartmentModel.deleteById(id);
    res.status(200).json({
        success: true,
        message: "Department deleted successfully."
    });
});
