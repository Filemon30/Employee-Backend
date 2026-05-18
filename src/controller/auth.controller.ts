import { Request, Response } from "express";
import { EmployeeModel } from "../models/employee.model";
import { UserAccountModel } from "../models/user-account.model";
import { AppError, asyncHandler } from "../utils/http";

const parseLoginValue = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  return value.trim();
};

const isAllowedLoginDepartmentAndPosition = (
  departmentName: string,
  positionName: string
): boolean => {
  const deptNorm = departmentName.trim().toLowerCase();
  const posNorm = positionName.trim().toLowerCase();

  const isHRDepartment =
    deptNorm.includes("human resources") || deptNorm.includes("hr");

  const allowedPositions = [
    "department head",
    "chief human resources officer",
    "hr generalist",
    "admin",
  ];

  const isAllowedPosition = allowedPositions.includes(posNorm);

  return isHRDepartment && isAllowedPosition;
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const username = parseLoginValue(req.body.username, "Username");
  const password = parseLoginValue(req.body.password, "Password");

  const account = await UserAccountModel.findByUsername(username);

  if (!account || account.password !== password) {
    throw new AppError("Invalid username or password.", 401);
  }

  if (!account.employees) {
    throw new AppError("User account is not linked to an employee record.", 403);
  }

  const employee = await EmployeeModel.findById(account.employees.employee_id);

  if (!employee) {
    throw new AppError("Employee record not found.", 404);
  }

  const positionName = employee.positions?.position_name?.trim() ?? "";
  const departmentName = employee.positions?.departments?.department_name?.trim() ?? "";

  if (
    !positionName ||
    !departmentName ||
    !isAllowedLoginDepartmentAndPosition(departmentName, positionName)
  ) {
    throw new AppError("You are not authorized to log in.", 403);
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