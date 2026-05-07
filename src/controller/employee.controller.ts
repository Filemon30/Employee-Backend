import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { EmployeeModel } from "../models/employee.model";
import { UserInformationModel } from "../models/user-information.model";
import { UserAccountModel } from "../models/user-account.model";
import { WorkHourModel } from "../models/work-hour.model";
import { DepartmentModel } from "../models/department.model";
import { PositionModel } from "../models/position.model";
import { AppError, asyncHandler } from "../utils/http";
import { Gender } from "../models/enums.model";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid employee ID.", 400);
  }

  return id;
};

// CREATE EMPLOYEE WITH COMPLETE FLOW
// Step 1: Department & Position selection
// Step 2: Work hours (select existing work_hour_id)
// Step 3: Personal information, address, contact number
// Step 4: Account information
export const createEmployee = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      // Step 1: Job Information
      department_id,
      position_id,
      // Step 2: Work Hours
      work_hour_id,
      // Step 3: Personal Information
      first_name,
      middle_name,
      last_name,
      suffix,
      gender,
      birthdate,
      // Step 3: Address Information
      province,
      city,
      barangay,
      zip_code,
      // Step 3: Contact Details
      contact_number,
      // Step 4: Account Information
      username,
      password,
    } = req.body;

    // ========== VALIDATION ==========
    // Step 1: Validate Job Information
    if (!department_id || !position_id) {
      throw new AppError(
        "Department ID and Position ID are required.",
        400
      );
    }

    const department = await DepartmentModel.findById(department_id);
    if (!department) {
      throw new AppError("Department not found.", 404);
    }

    const position = await PositionModel.findById(position_id);
    if (!position) {
      throw new AppError("Position not found.", 404);
    }

    // Validate that position belongs to the selected department
    if (position.department_id !== department_id) {
      throw new AppError(
        "Selected position does not belong to the selected department.",
        400
      );
    }

    // Step 2: Validate Work Hour ID
    if (!work_hour_id) {
      throw new AppError("Work hour ID is required.", 400);
    }

    const workHour = await WorkHourModel.findById(work_hour_id);
    if (!workHour) {
      throw new AppError("Work hour not found.", 404);
    }

    // Step 3: Validate Personal Information
    if (!first_name || !last_name || !gender || !birthdate) {
      throw new AppError(
        "First name, last name, gender, and birthdate are required.",
        400
      );
    }

    // Step 3: Validate Address Information
    if (!province || !city || !barangay || !zip_code) {
      throw new AppError(
        "Province, city, barangay, and zip code are required.",
        400
      );
    }

    // Step 3: Validate Contact Details
    if (!contact_number) {
      throw new AppError("Contact number is required.", 400);
    }

    // Step 4: Validate Account Information
    if (!username || !password) {
      throw new AppError("Username and password are required.", 400);
    }

    // Check if username already exists
    const existingAccount = await UserAccountModel.findByUsername(username);
    if (existingAccount) {
      throw new AppError("Username already exists.", 409);
    }

    // Validate gender enum
    const validGenders: Gender[] = ["Male", "Female"];
    if (!validGenders.includes(gender)) {
      throw new AppError(
        `Invalid gender. Must be one of: ${validGenders.join(", ")}`,
        400
      );
    }

    // ========== CREATE RECORDS ==========
    // Step 3: Create User Information
    const userInformation = await UserInformationModel.create({
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
    });

    // Step 4: Create User Account
    const userAccount = await UserAccountModel.create({
      username,
      password,
    });

    // Step 1: Create Employee (without card_id as it will be updated later)
    const employee = await EmployeeModel.create({
      position_id,
      info_id: userInformation.info_id,
      acc_id: userAccount.acc_id,
      work_hour_id,
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      data: employee,
    });
  }
);

// GET ALL EMPLOYEES
export const getAllEmployees = asyncHandler(
  async (req: Request, res: Response) => {
    const employees = await EmployeeModel.findAll();

    res.status(200).json({
      success: true,
      message: "Employees retrieved successfully.",
      data: employees,
    });
  }
);

// GET EMPLOYEE BY ID
export const getEmployeeById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const employee = await EmployeeModel.findById(id);

    if (!employee) {
      throw new AppError("Employee not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Employee retrieved successfully.",
      data: employee,
    });
  }
);

// UPDATE EMPLOYEE
export const updateEmployee = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const {
      update_type,
      department_id,
      position_id,
      card_number,
      password,
    } = req.body;

    const existing = await EmployeeModel.findById(id);

    if (!existing) {
      throw new AppError("Employee not found.", 404);
    }

    if (!update_type) {
      throw new AppError(
        "Please select what you want to update: Password, Position, or Card.",
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      const employeeData: Prisma.employeesUncheckedUpdateInput = {};
      let handledUpdate = false;

      if (update_type === "Position") {
        if (position_id === undefined) {
          throw new AppError("Position is required.", 400);
        }

        const position = await tx.positions.findUnique({
          where: { position_id },
        });

        if (!position) {
          throw new AppError("Position not found.", 404);
        }

        if (
          department_id !== undefined &&
          position.department_id !== department_id
        ) {
          throw new AppError(
            "Selected position does not belong to the selected department.",
            400
          );
        }

        employeeData.position_id = position_id;
        handledUpdate = true;
      }

      if (update_type === "Card") {
        if (card_number === undefined) {
          throw new AppError("Card number is required.", 400);
        }

        const normalizedCardNumber = String(card_number).trim();

        if (!normalizedCardNumber) {
          throw new AppError("Card number is required.", 400);
        }

        const existingCard = await tx.cards.findUnique({
          where: { card_number: normalizedCardNumber },
          include: { employees: true },
        });

        if (
          existingCard?.employees &&
          existingCard.employees.employee_id !== id
        ) {
          throw new AppError(
            "Card number is already assigned to another employee.",
            409
          );
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
          throw new AppError("Password is required.", 400);
        }

        const newPassword = String(password).trim();

        if (!newPassword) {
          throw new AppError("Password is required.", 400);
        }

        await tx.user_accounts.update({
          where: { acc_id: existing.acc_id },
          data: {
            password: newPassword,
          },
        });

        handledUpdate = true;
      }

      if (!handledUpdate) {
        throw new AppError(
          "Invalid update type. Use Password, Position, or Card.",
          400
        );
      }

      await tx.employees.update({
        where: { employee_id: id },
        data: employeeData,
      });
    });

    const employee = await EmployeeModel.findById(id);

    res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      data: employee,
    });
  }
);

// DELETE EMPLOYEE
export const deleteEmployee = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const existing = await EmployeeModel.findById(id);

    if (!existing) {
      throw new AppError("Employee not found.", 404);
    }

    await EmployeeModel.deleteById(id);

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
    });
  }
);
