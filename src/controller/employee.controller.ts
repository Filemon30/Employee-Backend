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
import { getTransactedById, logCrudTransaction } from "../utils/activity-log";
import { nextIdFromMax } from "../utils/next-id";

const isDepartmentHeadPosition = (positionName: string) => {
  const normalized = positionName.trim().toLowerCase();
  return normalized === "manager" || normalized.includes("head");
};

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
// Step 2: Work hours (select existing morning_work_hour_id and/or afternoon_work_hour_id)
// Step 3: Personal information, address, contact number
// Step 4: Account information
export const createEmployee = asyncHandler(
  async (req: Request, res: Response) => {
    const transactedBy = getTransactedById(req);
    const {
      // Step 1: Job Information
      department_id,
      position_id,
      // Step 2: Work Hours
      morning_work_hour_id,
      afternoon_work_hour_id,
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

    // Step 2: Validate Work Hour IDs
    if (!morning_work_hour_id && !afternoon_work_hour_id) {
      throw new AppError(
        "At least one work hour ID is required (morning or afternoon).",
        400
      );
    }

    let morningWorkHour = null;
    let afternoonWorkHour = null;

    if (morning_work_hour_id) {
      morningWorkHour = await WorkHourModel.findById(morning_work_hour_id);
      if (!morningWorkHour) {
        throw new AppError("Morning work hour not found.", 404);
      }
    }

    if (afternoon_work_hour_id) {
      afternoonWorkHour = await WorkHourModel.findById(afternoon_work_hour_id);
      if (!afternoonWorkHour) {
        throw new AppError("Afternoon work hour not found.", 404);
      }
    }

    if (
      morning_work_hour_id &&
      afternoon_work_hour_id &&
      morning_work_hour_id === afternoon_work_hour_id
    ) {
      throw new AppError(
        "Morning and afternoon work hour IDs must be different.",
        400
      );
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
    const willUpdateDepartmentHead = isDepartmentHeadPosition(position.position_name);

    const employee = await prisma.$transaction(async (tx) => {
      const infoId = await nextIdFromMax(async () => {
        const result = await tx.user_informations.aggregate({
          _max: { info_id: true },
        });
        return result._max.info_id;
      });

      const accId = await nextIdFromMax(async () => {
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

      const employeeId = await nextIdFromMax(async () => {
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
        if (
          department.department_head &&
          department.department_head !== createdEmployee.employee_id
        ) {
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

    await logCrudTransaction({
      action: "New",
      resource: "Employee",
      transactedBy,
      department_id: department.department_id,
      position_id: employee.position_id ?? undefined,
      work_hour_id:
        employee.morning_work_hour_id ?? employee.afternoon_work_hour_id ?? undefined,
      employee_id: employee.employee_id,
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
      morning_work_hour_id,
      afternoon_work_hour_id,
    } = req.body;

    const existing = await EmployeeModel.findById(id);

    if (!existing) {
      throw new AppError("Employee not found.", 404);
    }

    const transactedBy = getTransactedById(req);

    if (!update_type) {
      throw new AppError(
        "Please select what you want to update: Password, Position, Card, or Shift.",
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

        const positionName = position.position_name.trim().toLowerCase();
        const isDepartmentHeadPosition =
          positionName === "manager" || positionName.includes("head");

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
            throw new AppError("Department not found.", 404);
          }

          if (
            targetDepartment.department_head &&
            targetDepartment.department_head !== id
          ) {
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
        } else if (currentHeadDepartments.length > 0) {
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

      if (update_type === "Shift") {
        if (morning_work_hour_id === undefined || afternoon_work_hour_id === undefined) {
          throw new AppError("Both morning and afternoon work hour IDs are required.", 400);
        }

        // Check if employee already has these work hours assigned
        if (existing.morning_work_hour_id === morning_work_hour_id && existing.afternoon_work_hour_id === afternoon_work_hour_id) {
          throw new AppError("Employee already has these shift times assigned.", 400);
        }

        const morningWorkHour = await tx.work_hours.findUnique({
          where: { work_hour_id: morning_work_hour_id },
        });

        const afternoonWorkHour = await tx.work_hours.findUnique({
          where: { work_hour_id: afternoon_work_hour_id },
        });

        if (!morningWorkHour) {
          throw new AppError("Morning work hour not found.", 404);
        }

        if (!afternoonWorkHour) {
          throw new AppError("Afternoon work hour not found.", 404);
        }

        employeeData.morning_work_hour_id = morning_work_hour_id;
        employeeData.afternoon_work_hour_id = afternoon_work_hour_id;
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

    await logCrudTransaction({
      action: "Update",
      resource: "Employee",
      transactedBy,
      department_id: employee?.positions?.department_id,
      position_id: employee?.position_id ?? undefined,
      work_hour_id:
        employee?.morning_work_hour_id ?? employee?.afternoon_work_hour_id ?? undefined,
      employee_id: id,
    });

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

    await prisma.$transaction(async (tx) => {
      await tx.transactions.deleteMany({
        where: {
          OR: [
            { employee_id: id },
            { transacted_by: id },
          ],
        },
      });

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

    await logCrudTransaction({
      action: "Delete",
      resource: "Employee",
      transactedBy: getTransactedById(req),
      department_id: existing.positions?.department_id,
      position_id: existing.position_id ?? undefined,
      work_hour_id:
        existing.morning_work_hour_id ?? existing.afternoon_work_hour_id ?? undefined,
      employee_id: id,
    });

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
    });
  }
);
