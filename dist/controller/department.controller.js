"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.getDepartmentById = exports.getAllDepartments = exports.createDepartment = void 0;
const department_model_1 = require("../models/department.model");
const employee_model_1 = require("../models/employee.model");
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
const activity_log_1 = require("../utils/activity-log");
const next_id_1 = require("../utils/next-id");
const DEPARTMENT_HEAD_POSITION_NAME = "Department Head";
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
// CREATE
exports.createDepartment = (0, http_1.asyncHandler)(async (req, res) => {
    const { department_name, department_head } = req.body;
    const transactedBy = (0, activity_log_1.getTransactedById)(req);
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
    await (0, activity_log_1.logCrudTransaction)({
        action: "Create",
        resource: "Department",
        transactedBy,
        department_id: department.department_id,
    });
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
            const transactionSteps = [];
            if (existing.department_head && existing.department_head !== parsedDepartmentHead) {
                transactionSteps.push(db_1.prisma.employees.update({ where: { employee_id: existing.department_head }, data: { position_id: null } }));
            }
            transactionSteps.push(db_1.prisma.departments.update({ where: { department_id: id }, data: { department_head: parsedDepartmentHead } }));
            // Execute transaction
            await db_1.prisma.$transaction(transactionSteps);
            const updated = await department_model_1.DepartmentModel.findById(id);
            await (0, activity_log_1.logCrudTransaction)({
                action: "Update",
                resource: "Department",
                transactedBy: (0, activity_log_1.getTransactedById)(req),
                department_id: id,
            });
            res.status(200).json({
                success: true,
                message: "Department updated successfully.",
                data: updated,
            });
            return;
        }
        if (parsedDepartmentHead === null) {
            const transactionSteps = [];
            if (existing.department_head) {
                transactionSteps.push(db_1.prisma.employees.update({ where: { employee_id: existing.department_head }, data: { position_id: null } }));
            }
            transactionSteps.push(db_1.prisma.departments.update({ where: { department_id: id }, data: { department_head: null } }));
            await db_1.prisma.$transaction(transactionSteps);
            const updated = await department_model_1.DepartmentModel.findById(id);
            await (0, activity_log_1.logCrudTransaction)({
                action: "Update",
                resource: "Department",
                transactedBy: (0, activity_log_1.getTransactedById)(req),
                department_id: id,
            });
            res.status(200).json({
                success: true,
                message: "Department updated successfully.",
                data: updated,
            });
            return;
        }
    }
    const department = await department_model_1.DepartmentModel.updateById(id, updateData);
    await (0, activity_log_1.logCrudTransaction)({
        action: "Update",
        resource: "Department",
        transactedBy: (0, activity_log_1.getTransactedById)(req),
        department_id: department.department_id,
    });
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
    await db_1.prisma.$transaction(async (tx) => {
        const actorId = (0, activity_log_1.getTransactedById)(req);
        const txId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await tx.transactions.aggregate({ _max: { transaction_id: true } });
            return result._max.transaction_id;
        });
        await tx.transactions.create({
            data: {
                transaction_id: txId,
                transaction_type: 'Department Deleted',
                transacted_by: actorId,
                reference_type: 'Department',
                department_id: existing.department_id,
            }
        });
        await department_model_1.DepartmentModel.deleteById(id);
    });
    res.status(200).json({
        success: true,
        message: "Department deleted successfully.",
    });
});
