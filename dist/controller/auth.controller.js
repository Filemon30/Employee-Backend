"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const employee_model_1 = require("../models/employee.model");
const user_account_model_1 = require("../models/user-account.model");
const http_1 = require("../utils/http");
const parseLoginValue = (value, fieldName) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new http_1.AppError(`${fieldName} is required.`, 400);
    }
    return value.trim();
};
const isAllowedLoginDepartmentAndPosition = (departmentName, positionName) => {
    const deptNorm = departmentName.trim().toLowerCase();
    const posNorm = positionName.trim().toLowerCase();
    const isHRDepartment = deptNorm.includes("human resources") || deptNorm.includes("hr");
    const allowedPositions = [
        "department head",
        "chief human resources officer",
        "hr generalist",
        "admin",
    ];
    const isAllowedPosition = allowedPositions.includes(posNorm);
    return isHRDepartment && isAllowedPosition;
};
exports.login = (0, http_1.asyncHandler)(async (req, res) => {
    const username = parseLoginValue(req.body.username, "Username");
    const password = parseLoginValue(req.body.password, "Password");
    const account = await user_account_model_1.UserAccountModel.findByUsername(username);
    if (!account || account.password !== password) {
        throw new http_1.AppError("Invalid username or password.", 401);
    }
    if (!account.employees) {
        throw new http_1.AppError("User account is not linked to an employee record.", 403);
    }
    const employee = await employee_model_1.EmployeeModel.findById(account.employees.employee_id);
    if (!employee) {
        throw new http_1.AppError("Employee record not found.", 404);
    }
    const positionName = employee.positions?.position_name?.trim() ?? "";
    const departmentName = employee.positions?.departments?.department_name?.trim() ?? "";
    if (!positionName ||
        !departmentName ||
        !isAllowedLoginDepartmentAndPosition(departmentName, positionName)) {
        throw new http_1.AppError("You are not authorized to log in.", 403);
    }
    const firstName = employee.user_informations?.first_name ?? "";
    const middleName = employee.user_informations?.middle_name ?? "";
    const lastName = employee.user_informations?.last_name ?? "";
    const suffix = employee.user_informations?.suffix ?? "";
    const displayName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
    res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
            employeeId: employee.employee_id,
            accountId: account.acc_id,
            username: account.username,
            firstName,
            middleName,
            lastName,
            suffix,
            displayName,
            role: employee.positions?.position_name ?? "",
            department: employee.positions?.departments?.department_name ?? "",
        },
    });
});
