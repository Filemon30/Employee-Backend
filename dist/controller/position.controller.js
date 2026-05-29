"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePosition = exports.updatePosition = exports.getPositionById = exports.getAllPositions = exports.createPosition = void 0;
const db_1 = require("../config/db");
const position_model_1 = require("../models/position.model");
const salary_model_1 = require("../models/salary.model");
const http_1 = require("../utils/http");
const activity_log_1 = require("../utils/activity-log");
const next_id_1 = require("../utils/next-id");
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid position ID.", 400);
    }
    return id;
};
// NORMALIZE SALARY AMOUNT
const normalizeSalary = (amount) => {
    return String(amount)
        .trim()
        .replace(/,/g, "")
        .replace(/^0+(?=\d)/, "");
};
// CREATE - Handle both new and existing salary
// CREATE - Correct salary handling (no duplicates ever)
exports.createPosition = (0, http_1.asyncHandler)(async (req, res) => {
    const { department_id, position_name, salary_type, salary_amount, salary_id } = req.body;
    const deptId = Number(Array.isArray(department_id) ? department_id[0] : department_id);
    if (!deptId || isNaN(deptId)) {
        throw new http_1.AppError("Invalid department ID.", 400);
    }
    const transactedBy = (0, activity_log_1.getTransactedById)(req);
    if (!department_id || !position_name || !salary_type) {
        throw new http_1.AppError("Department ID, position name, and salary type are required.", 400);
    }
    const trimmedPositionName = position_name.trim();
    const existingPositionOutsideTransaction = await position_model_1.PositionModel.findByNameAndDepartment(trimmedPositionName, deptId);
    if (existingPositionOutsideTransaction) {
        throw new http_1.AppError(`Position "${trimmedPositionName}" already exists in this department.`, 409);
    }
    try {
        // ✅ ALL VALIDATIONS INSIDE TRANSACTION - NOTHING GETS SAVED IF ANY CHECK FAILS
        const position = await db_1.prisma.$transaction(async (tx) => {
            // Step 1: Check if position already exists - FAIL IMMEDIATELY if true
            const existingPosition = await tx.positions.findFirst({
                where: {
                    position_name: trimmedPositionName,
                    department_id: deptId,
                },
            });
            if (existingPosition) {
                throw new http_1.AppError(`Position "${trimmedPositionName}" already exists in this department.`, 409);
            }
            // Step 2: Validate salary type and prepare salary ID
            if (salary_type === "new") {
                // NEW SALARY: Validate amount exists
                if (!salary_amount) {
                    throw new http_1.AppError("Salary amount is required for new salary.", 400);
                }
                // Check if salary amount already exists
                const normalizedAmount = normalizeSalary(salary_amount);
                const existingSalary = await tx.salaries.findFirst({
                    where: { amount: normalizedAmount },
                });
                if (existingSalary) {
                    throw new http_1.AppError(`Salary amount "${normalizedAmount}" already exists. Please select it from existing salaries or use a different amount.`, 409);
                }
                // Create new salary
                const salary = await salary_model_1.SalaryModel.createOrGet({
                    amount: normalizedAmount,
                }, tx);
                // Step 3: Create position (ONLY if position check + salary creation passed)
                return await position_model_1.PositionModel.create({
                    department_id: deptId,
                    position_name: trimmedPositionName,
                    salary_id: salary.salary_id,
                }, tx);
            }
            else if (salary_type === "existing") {
                // EXISTING SALARY: Validate ID and find salary
                if (!salary_id) {
                    throw new http_1.AppError("Salary ID is required for existing salary.", 400);
                }
                const salary = await salary_model_1.SalaryModel.findById(Number(salary_id), tx);
                if (!salary) {
                    throw new http_1.AppError("Selected salary not found.", 404);
                }
                // Step 3: Create position with existing salary
                return await position_model_1.PositionModel.create({
                    department_id: deptId,
                    position_name: trimmedPositionName,
                    salary_id: salary.salary_id,
                }, tx);
            }
            else {
                throw new http_1.AppError("Invalid salary type. Use 'new' or 'existing'.", 400);
            }
        }, {
            // Ensure transaction isolation level is strict
            isolationLevel: "Serializable",
        });
        // Only log if transaction succeeded
        await (0, activity_log_1.logCrudTransaction)({
            action: "Create",
            resource: "Position",
            transactedBy,
            department_id: position.department_id,
            position_id: position.position_id,
            salary_id: position.salary_id,
        });
        res.status(201).json({
            success: true,
            message: "Position created successfully.",
            data: position,
        });
    }
    catch (error) {
        // Re-throw to be caught by error middleware
        throw error;
    }
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
    const { department_id, position_name, salary_type, salary_amount, salary_id } = req.body;
    const existing = await position_model_1.PositionModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Position not found.", 404);
    }
    // ✅ VALIDATE ALL INPUTS FIRST before processing salary
    const updateData = {};
    if (department_id) {
        updateData.department_id = department_id;
    }
    if (position_name) {
        updateData.position_name = position_name.trim();
    }
    // Compute the prospective name and department to check duplicates
    const nameToCheck = updateData.position_name ?? existing.position_name;
    const deptToCheckRaw = updateData.department_id ?? existing.department_id;
    const deptToCheck = Number(Array.isArray(deptToCheckRaw) ? deptToCheckRaw[0] : deptToCheckRaw);
    if (!deptToCheck || isNaN(deptToCheck)) {
        throw new http_1.AppError("Invalid department ID.", 400);
    }
    // ✅ CHECK FOR DUPLICATE POSITION NAME FIRST (before salary processing)
    const duplicate = await position_model_1.PositionModel.findByNameAndDepartment(nameToCheck, deptToCheck);
    if (duplicate && duplicate.position_id !== existing.position_id) {
        throw new http_1.AppError(`Position "${nameToCheck}" already exists in this department.`, 409);
    }
    // ✅ VALIDATE SALARY INPUTS BEFORE TRANSACTION
    if (salary_type) {
        if (salary_type === "new") {
            if (!salary_amount) {
                throw new http_1.AppError("Salary amount is required for new salary.", 400);
            }
            // Check if salary amount already exists BEFORE transaction
            const normalizedAmount = normalizeSalary(salary_amount);
            const existingSalary = await salary_model_1.SalaryModel.findByAmount(normalizedAmount);
            if (existingSalary) {
                throw new http_1.AppError(`Salary amount "${normalizedAmount}" already exists. Please select it from existing salaries or use a different amount.`, 409);
            }
        }
        else if (salary_type === "existing") {
            if (!salary_id) {
                throw new http_1.AppError("Salary ID is required for existing salary.", 400);
            }
            const salaryExists = await salary_model_1.SalaryModel.findById(Number(salary_id));
            if (!salaryExists) {
                throw new http_1.AppError("Selected salary not found.", 404);
            }
        }
        else {
            throw new http_1.AppError("Invalid salary type. Use 'new' or 'existing'.", 400);
        }
    }
    else if (salary_id !== undefined) {
        const salaryExists = await salary_model_1.SalaryModel.findById(Number(salary_id));
        if (!salaryExists) {
            throw new http_1.AppError("Selected salary not found.", 404);
        }
    }
    // ✅ NOW process salary and update in transaction (after all validations pass)
    const position = await db_1.prisma.$transaction(async (tx) => {
        if (salary_type) {
            if (salary_type === "new") {
                const normalizedAmount = normalizeSalary(salary_amount);
                const salary = await salary_model_1.SalaryModel.createOrGet({
                    amount: normalizedAmount,
                }, tx);
                updateData.salary_id = salary.salary_id;
            }
            else if (salary_type === "existing") {
                const salary = await salary_model_1.SalaryModel.findById(Number(salary_id), tx);
                if (!salary) {
                    throw new http_1.AppError("Selected salary not found.", 404);
                }
                updateData.salary_id = salary.salary_id;
            }
        }
        else if (salary_id !== undefined) {
            const salary = await salary_model_1.SalaryModel.findById(Number(salary_id), tx);
            if (!salary) {
                throw new http_1.AppError("Selected salary not found.", 404);
            }
            updateData.salary_id = salary.salary_id;
        }
        return await position_model_1.PositionModel.updateById(id, updateData);
    }, {
        isolationLevel: "Serializable",
    });
    await (0, activity_log_1.logCrudTransaction)({
        action: "Update",
        resource: "Position",
        transactedBy: (0, activity_log_1.getTransactedById)(req),
        department_id: position.department_id,
        position_id: position.position_id,
        salary_id: position.salary_id,
    });
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
    // Perform delete and log in a single DB transaction so the delete log keeps the position reference
    await db_1.prisma.$transaction(async (tx) => {
        const actorId = (0, activity_log_1.getTransactedById)(req);
        // Create transaction log for this deletion
        const txId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await tx.transactions.aggregate({ _max: { transaction_id: true } });
            return result._max.transaction_id;
        });
        await tx.transactions.create({
            data: {
                transaction_id: txId,
                transaction_type: 'Position Delete',
                transacted_by: actorId,
                reference_type: 'Position',
                department_id: existing.department_id,
                position_id: existing.position_id,
                salary_id: existing.salary_id ?? undefined,
            },
        });
        // Delete position and cleanup refs using the transaction client
        await position_model_1.PositionModel.deleteById(id, tx);
    });
    res.status(200).json({
        success: true,
        message: "Position deleted successfully.",
    });
});
