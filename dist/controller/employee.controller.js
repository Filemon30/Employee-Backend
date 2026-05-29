"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.getEmployeeById = exports.getAllEmployees = exports.createEmployee = void 0;
const db_1 = require("../config/db");
const employee_model_1 = require("../models/employee.model");
const user_account_model_1 = require("../models/user-account.model");
const work_hour_model_1 = require("../models/work-hour.model");
const department_model_1 = require("../models/department.model");
const position_model_1 = require("../models/position.model");
const http_1 = require("../utils/http");
const activity_log_1 = require("../utils/activity-log");
const next_id_1 = require("../utils/next-id");
const isDepartmentHeadPosition = (positionName) => {
    const normalized = positionName.trim().toLowerCase();
    return normalized === "manager" || normalized.includes("head");
};
// SAFE ID PARSER
const parseId = (rawId) => {
    const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!id || isNaN(id)) {
        throw new http_1.AppError("Invalid employee ID.", 400);
    }
    return id;
};
// CREATE EMPLOYEE WITH COMPLETE FLOW
// Step 1: Department & Position selection
// Step 2: Work hours (select existing morning_work_hour_id and/or afternoon_work_hour_id)
// Step 3: Personal information, address, contact number
// Step 4: Account information
exports.createEmployee = (0, http_1.asyncHandler)(async (req, res) => {
    const transactedBy = (0, activity_log_1.getTransactedById)(req);
    const { 
    // Step 1: Job Information
    department_id, position_id, 
    // Step 2: Work Hours
    morning_work_hour_id, afternoon_work_hour_id, 
    // Step 3: Personal Information
    first_name, middle_name, last_name, suffix, gender, birthdate, 
    // Step 3: Address Information
    province, city, barangay, zip_code, 
    // Step 3: Contact Details
    contact_number, 
    // Step 4: Account Information
    username, password, } = req.body;
    // ========== VALIDATION ==========
    // Step 1: Validate Job Information
    if (!department_id || !position_id) {
        throw new http_1.AppError("Department ID and Position ID are required.", 400);
    }
    const department = await department_model_1.DepartmentModel.findById(department_id);
    if (!department) {
        throw new http_1.AppError("Department not found.", 404);
    }
    const position = await position_model_1.PositionModel.findById(position_id);
    if (!position) {
        throw new http_1.AppError("Position not found.", 404);
    }
    // Validate that position belongs to the selected department
    if (position.department_id !== department_id) {
        throw new http_1.AppError("Selected position does not belong to the selected department.", 400);
    }
    // Step 2: Validate Work Hour IDs
    if (!morning_work_hour_id && !afternoon_work_hour_id) {
        throw new http_1.AppError("At least one work hour ID is required (morning or afternoon).", 400);
    }
    let morningWorkHour = null;
    let afternoonWorkHour = null;
    if (morning_work_hour_id) {
        morningWorkHour = await work_hour_model_1.WorkHourModel.findById(morning_work_hour_id);
        if (!morningWorkHour) {
            throw new http_1.AppError("Morning work hour not found.", 404);
        }
    }
    if (afternoon_work_hour_id) {
        afternoonWorkHour = await work_hour_model_1.WorkHourModel.findById(afternoon_work_hour_id);
        if (!afternoonWorkHour) {
            throw new http_1.AppError("Afternoon work hour not found.", 404);
        }
    }
    if (morning_work_hour_id &&
        afternoon_work_hour_id &&
        morning_work_hour_id === afternoon_work_hour_id) {
        throw new http_1.AppError("Morning and afternoon work hour IDs must be different.", 400);
    }
    // Step 3: Validate Personal Information
    if (!first_name || !last_name || !gender || !birthdate) {
        throw new http_1.AppError("First name, last name, gender, and birthdate are required.", 400);
    }
    // Step 3: Validate Address Information
    if (!province || !city || !barangay || !zip_code) {
        throw new http_1.AppError("Province, city, barangay, and zip code are required.", 400);
    }
    // Step 3: Validate Contact Details
    if (!contact_number) {
        throw new http_1.AppError("Contact number is required.", 400);
    }
    // Step 4: Validate Account Information
    if (!username || !password) {
        throw new http_1.AppError("Username and password are required.", 400);
    }
    // Check if username already exists
    const existingAccount = await user_account_model_1.UserAccountModel.findByUsername(username);
    if (existingAccount) {
        throw new http_1.AppError("Username already exists.", 409);
    }
    // Validate gender enum
    const validGenders = ["Male", "Female"];
    if (!validGenders.includes(gender)) {
        throw new http_1.AppError(`Invalid gender. Must be one of: ${validGenders.join(", ")}`, 400);
    }
    // ========== CREATE RECORDS ==========
    const willUpdateDepartmentHead = isDepartmentHeadPosition(position.position_name);
    const employee = await db_1.prisma.$transaction(async (tx) => {
        const infoId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await tx.user_informations.aggregate({
                _max: { info_id: true },
            });
            return result._max.info_id;
        });
        const accId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await tx.user_accounts.aggregate({
                _max: { acc_id: true },
            });
            return result._max.acc_id;
        });
        const userInformation = await tx.user_informations.create({
            data: {
                info_id: infoId,
                first_name,
                middle_name: middle_name || undefined,
                last_name,
                suffix: suffix || undefined,
                gender,
                birthdate: new Date(birthdate),
                province,
                city,
                barangay,
                zip_code,
                contact_number,
            },
        });
        const userAccount = await tx.user_accounts.create({
            data: {
                acc_id: accId,
                username,
                password,
            },
        });
        const employeeId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await tx.employees.aggregate({
                _max: { employee_id: true },
            });
            return result._max.employee_id;
        });
        const createdEmployee = await tx.employees.create({
            data: {
                employee_id: employeeId,
                position_id,
                acc_id: userAccount.acc_id,
                info_id: userInformation.info_id,
                morning_work_hour_id: morning_work_hour_id ?? null,
                afternoon_work_hour_id: afternoon_work_hour_id ?? null,
            },
            include: {
                cards: true,
                positions: {
                    include: {
                        departments: true,
                        salaries: true,
                    },
                },
                user_accounts: true,
                user_informations: true,
                attendances: true,
                morning_work_hour: true,
                afternoon_work_hour: true,
            },
        });
        if (willUpdateDepartmentHead) {
            if (department.department_head &&
                department.department_head !== createdEmployee.employee_id) {
                await tx.employees.update({
                    where: { employee_id: department.department_head },
                    data: { position_id: null },
                });
            }
            await tx.departments.update({
                where: { department_id: department.department_id },
                data: { department_head: createdEmployee.employee_id },
            });
        }
        return createdEmployee;
    });
    await (0, activity_log_1.logCrudTransaction)({
        action: "New",
        resource: "Employee",
        transactedBy,
        department_id: department.department_id,
        position_id: employee.position_id ?? undefined,
        work_hour_id: employee.morning_work_hour_id ?? employee.afternoon_work_hour_id ?? undefined,
        employee_id: employee.employee_id,
    });
    res.status(201).json({
        success: true,
        message: "Employee created successfully.",
        data: employee,
    });
});
// GET ALL EMPLOYEES
exports.getAllEmployees = (0, http_1.asyncHandler)(async (req, res) => {
    const employees = await employee_model_1.EmployeeModel.findAll();
    res.status(200).json({
        success: true,
        message: "Employees retrieved successfully.",
        data: employees,
    });
});
// GET EMPLOYEE BY ID
exports.getEmployeeById = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const employee = await employee_model_1.EmployeeModel.findById(id);
    if (!employee) {
        throw new http_1.AppError("Employee not found.", 404);
    }
    res.status(200).json({
        success: true,
        message: "Employee retrieved successfully.",
        data: employee,
    });
});
// UPDATE EMPLOYEE
exports.updateEmployee = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const { update_type, department_id, position_id, card_number, password, morning_work_hour_id, afternoon_work_hour_id, } = req.body;
    const existing = await employee_model_1.EmployeeModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Employee not found.", 404);
    }
    const transactedBy = (0, activity_log_1.getTransactedById)(req);
    if (!update_type) {
        throw new http_1.AppError("Please select what you want to update: Password, Position, Card, or Shift.", 400);
    }
    await db_1.prisma.$transaction(async (tx) => {
        const employeeData = {};
        let handledUpdate = false;
        if (update_type === "Position") {
            if (position_id === undefined) {
                throw new http_1.AppError("Position is required.", 400);
            }
            const position = await tx.positions.findUnique({
                where: { position_id },
            });
            if (!position) {
                throw new http_1.AppError("Position not found.", 404);
            }
            if (department_id !== undefined &&
                position.department_id !== department_id) {
                throw new http_1.AppError("Selected position does not belong to the selected department.", 400);
            }
            employeeData.position_id = position_id;
            const positionName = position.position_name.trim().toLowerCase();
            const isDepartmentHeadPosition = positionName === "manager" || positionName.includes("head");
            const currentHeadDepartments = await tx.departments.findMany({
                where: { department_head: id },
                select: {
                    department_id: true,
                },
            });
            if (isDepartmentHeadPosition) {
                const targetDepartment = await tx.departments.findUnique({
                    where: { department_id: position.department_id },
                    select: {
                        department_id: true,
                        department_head: true,
                    },
                });
                if (!targetDepartment) {
                    throw new http_1.AppError("Department not found.", 404);
                }
                if (targetDepartment.department_head &&
                    targetDepartment.department_head !== id) {
                    await tx.employees.update({
                        where: { employee_id: targetDepartment.department_head },
                        data: { position_id: null },
                    });
                }
                for (const currentHeadDepartment of currentHeadDepartments) {
                    if (currentHeadDepartment.department_id === targetDepartment.department_id) {
                        continue;
                    }
                    await tx.departments.update({
                        where: { department_id: currentHeadDepartment.department_id },
                        data: { department_head: null },
                    });
                }
                await tx.departments.update({
                    where: { department_id: targetDepartment.department_id },
                    data: { department_head: id },
                });
            }
            else if (currentHeadDepartments.length > 0) {
                for (const currentHeadDepartment of currentHeadDepartments) {
                    await tx.departments.update({
                        where: { department_id: currentHeadDepartment.department_id },
                        data: { department_head: null },
                    });
                }
            }
            handledUpdate = true;
        }
        if (update_type === "Card") {
            if (card_number === undefined) {
                throw new http_1.AppError("Card number is required.", 400);
            }
            const normalizedCardNumber = String(card_number).trim();
            if (!normalizedCardNumber) {
                throw new http_1.AppError("Card number is required.", 400);
            }
            const existingCard = await tx.cards.findUnique({
                where: { card_number: normalizedCardNumber },
                include: { employees: true },
            });
            if (existingCard?.employees &&
                existingCard.employees.employee_id !== id) {
                throw new http_1.AppError("Card number is already assigned to another employee.", 409);
            }
            let cardId = existingCard?.card_id;
            if (!cardId) {
                const maxCard = await tx.cards.aggregate({
                    _max: { card_id: true },
                });
                cardId = (maxCard._max.card_id ?? 0) + 1;
                await tx.cards.create({
                    data: {
                        card_id: cardId,
                        card_number: normalizedCardNumber,
                    },
                });
            }
            employeeData.card_id = cardId;
            handledUpdate = true;
        }
        if (update_type === "Password") {
            if (password === undefined) {
                throw new http_1.AppError("Password is required.", 400);
            }
            const newPassword = String(password).trim();
            if (!newPassword) {
                throw new http_1.AppError("Password is required.", 400);
            }
            await tx.user_accounts.update({
                where: { acc_id: existing.acc_id },
                data: {
                    password: newPassword,
                },
            });
            handledUpdate = true;
        }
        if (update_type === "Shift") {
            if (morning_work_hour_id === undefined || afternoon_work_hour_id === undefined) {
                throw new http_1.AppError("Both morning and afternoon work hour IDs are required.", 400);
            }
            // Check if employee already has these work hours assigned
            if (existing.morning_work_hour_id === morning_work_hour_id && existing.afternoon_work_hour_id === afternoon_work_hour_id) {
                throw new http_1.AppError("Employee already has these shift times assigned.", 400);
            }
            const morningWorkHour = await tx.work_hours.findUnique({
                where: { work_hour_id: morning_work_hour_id },
            });
            const afternoonWorkHour = await tx.work_hours.findUnique({
                where: { work_hour_id: afternoon_work_hour_id },
            });
            if (!morningWorkHour) {
                throw new http_1.AppError("Morning work hour not found.", 404);
            }
            if (!afternoonWorkHour) {
                throw new http_1.AppError("Afternoon work hour not found.", 404);
            }
            employeeData.morning_work_hour_id = morning_work_hour_id;
            employeeData.afternoon_work_hour_id = afternoon_work_hour_id;
            handledUpdate = true;
        }
        if (!handledUpdate) {
            throw new http_1.AppError("Invalid update type. Use Password, Position, or Card.", 400);
        }
        await tx.employees.update({
            where: { employee_id: id },
            data: employeeData,
        });
    });
    const employee = await employee_model_1.EmployeeModel.findById(id);
    await (0, activity_log_1.logCrudTransaction)({
        action: "Update",
        resource: "Employee",
        transactedBy,
        department_id: employee?.positions?.department_id,
        position_id: employee?.position_id ?? undefined,
        work_hour_id: employee?.morning_work_hour_id ?? employee?.afternoon_work_hour_id ?? undefined,
        employee_id: id,
    });
    res.status(200).json({
        success: true,
        message: "Employee updated successfully.",
        data: employee,
    });
});
// DELETE EMPLOYEE
exports.deleteEmployee = (0, http_1.asyncHandler)(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await employee_model_1.EmployeeModel.findById(id);
    if (!existing) {
        throw new http_1.AppError("Employee not found.", 404);
    }
    await db_1.prisma.$transaction(async (tx) => {
        const actorId = (0, activity_log_1.getTransactedById)(req);
        // Create a transaction record for this delete action within the same transaction
        const txId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await tx.transactions.aggregate({ _max: { transaction_id: true } });
            return result._max.transaction_id;
        });
        await tx.transactions.create({
            data: {
                transaction_id: txId,
                transaction_type: 'Employee Delete',
                transacted_by: actorId,
                reference_type: 'Employee',
                department_id: existing.positions?.department_id ?? undefined,
                position_id: existing.position_id ?? undefined,
                employee_id: existing.employee_id,
            },
        });
        // Safe to delete the employee record now.
        await tx.employees.delete({
            where: { employee_id: id },
        });
        if (existing.card_id) {
            await tx.cards.delete({
                where: { card_id: existing.card_id },
            });
        }
        if (existing.acc_id) {
            await tx.user_accounts.delete({
                where: { acc_id: existing.acc_id },
            });
        }
        if (existing.info_id) {
            await tx.user_informations.delete({
                where: { info_id: existing.info_id },
            });
        }
    });
    // Delete already logged inside DB transaction to preserve references and avoid FK issues.
    res.status(200).json({
        success: true,
        message: "Employee deleted successfully.",
    });
});
