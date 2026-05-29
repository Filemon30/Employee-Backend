import { Request, Response } from "express";
import { prisma } from "../config/db";
import { PositionModel } from "../models/position.model";
import { SalaryModel } from "../models/salary.model";
import { AppError, asyncHandler } from "../utils/http";
import { getTransactedById, logCrudTransaction } from "../utils/activity-log";
import { nextIdFromMax } from "../utils/next-id";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid position ID.", 400);
  }

  return id;
};

// NORMALIZE SALARY AMOUNT
const normalizeSalary = (amount: unknown): string => {
  return String(amount)
    .trim()
    .replace(/,/g, "")
    .replace(/^0+(?=\d)/, "");
};

// CREATE - Handle both new and existing salary
// CREATE - Correct salary handling (no duplicates ever)
export const createPosition = asyncHandler(
  async (req: Request, res: Response) => {
    const { department_id, position_name, salary_type, salary_amount, salary_id } = req.body;
    const deptId = Number(Array.isArray(department_id) ? department_id[0] : department_id);
    if (!deptId || isNaN(deptId)) {
      throw new AppError("Invalid department ID.", 400);
    }
    const transactedBy = getTransactedById(req);

    if (!department_id || !position_name || !salary_type) {
      throw new AppError(
        "Department ID, position name, and salary type are required.",
        400
      );
    }

    const trimmedPositionName = position_name.trim();

    const existingPositionOutsideTransaction = await PositionModel.findByNameAndDepartment(
      trimmedPositionName,
      deptId,
    );

    if (existingPositionOutsideTransaction) {
      throw new AppError(
        `Position "${trimmedPositionName}" already exists in this department.`,
        409,
      );
    }

    try {
      // ✅ ALL VALIDATIONS INSIDE TRANSACTION - NOTHING GETS SAVED IF ANY CHECK FAILS
      const position = await prisma.$transaction(async (tx) => {
        // Step 1: Check if position already exists - FAIL IMMEDIATELY if true
        const existingPosition = await tx.positions.findFirst({
          where: {
            position_name: trimmedPositionName,
            department_id: deptId,
          },
        });

        if (existingPosition) {
          throw new AppError(
            `Position "${trimmedPositionName}" already exists in this department.`,
            409,
          );
        }

        // Step 2: Validate salary type and prepare salary ID
        if (salary_type === "new") {
          // NEW SALARY: Validate amount exists
          if (!salary_amount) {
            throw new AppError("Salary amount is required for new salary.", 400);
          }

          // Check if salary amount already exists
          const normalizedAmount = normalizeSalary(salary_amount);
          const existingSalary = await tx.salaries.findFirst({
            where: { amount: normalizedAmount },
          });

          if (existingSalary) {
            throw new AppError(
              `Salary amount "${normalizedAmount}" already exists. Please select it from existing salaries or use a different amount.`,
              409,
            );
          }

          // Create new salary
          const salary = await SalaryModel.createOrGet(
            {
              amount: normalizedAmount,
            },
            tx,
          );

          // Step 3: Create position (ONLY if position check + salary creation passed)
          return await PositionModel.create(
            {
              department_id: deptId,
              position_name: trimmedPositionName,
              salary_id: salary.salary_id,
            },
            tx,
          );
        } else if (salary_type === "existing") {
          // EXISTING SALARY: Validate ID and find salary
          if (!salary_id) {
            throw new AppError("Salary ID is required for existing salary.", 400);
          }

          const salary = await SalaryModel.findById(Number(salary_id), tx);
          if (!salary) {
            throw new AppError("Selected salary not found.", 404);
          }

          // Step 3: Create position with existing salary
          return await PositionModel.create(
            {
              department_id: deptId,
              position_name: trimmedPositionName,
              salary_id: salary.salary_id,
            },
            tx,
          );
        } else {
          throw new AppError("Invalid salary type. Use 'new' or 'existing'.", 400);
        }
      }, {
        // Ensure transaction isolation level is strict
        isolationLevel: "Serializable",
      });

      // Only log if transaction succeeded
      await logCrudTransaction({
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
    } catch (error) {
      // Re-throw to be caught by error middleware
      throw error;
    }
  }
);

// GET ALL
export const getAllPositions = asyncHandler(
  async (_req: Request, res: Response) => {
    const positions = await PositionModel.findAll();

    res.status(200).json({
      success: true,
      message: "Positions retrieved successfully.",
      data: positions,
    });
  }
);

// GET BY ID
export const getPositionById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const position = await PositionModel.findById(id);

    if (!position) {
      throw new AppError("Position not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Position retrieved successfully.",
      data: position,
    });
  }
);

// UPDATE
export const updatePosition = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const { department_id, position_name, salary_type, salary_amount, salary_id } = req.body;

    const existing = await PositionModel.findById(id);

    if (!existing) {
      throw new AppError("Position not found.", 404);
    }

    // ✅ VALIDATE ALL INPUTS FIRST before processing salary
    const updateData: any = {};

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
      throw new AppError("Invalid department ID.", 400);
    }

    // ✅ CHECK FOR DUPLICATE POSITION NAME FIRST (before salary processing)
    const duplicate = await PositionModel.findByNameAndDepartment(nameToCheck, deptToCheck);
    if (duplicate && duplicate.position_id !== existing.position_id) {
      throw new AppError(`Position "${nameToCheck}" already exists in this department.`, 409);
    }

    // ✅ VALIDATE SALARY INPUTS BEFORE TRANSACTION
    if (salary_type) {
      if (salary_type === "new") {
        if (!salary_amount) {
          throw new AppError("Salary amount is required for new salary.", 400);
        }

        // Check if salary amount already exists BEFORE transaction
        const normalizedAmount = normalizeSalary(salary_amount);
        const existingSalary = await SalaryModel.findByAmount(normalizedAmount);

        if (existingSalary) {
          throw new AppError(
            `Salary amount "${normalizedAmount}" already exists. Please select it from existing salaries or use a different amount.`,
            409,
          );
        }
      } else if (salary_type === "existing") {
        if (!salary_id) {
          throw new AppError("Salary ID is required for existing salary.", 400);
        }
        const salaryExists = await SalaryModel.findById(Number(salary_id));
        if (!salaryExists) {
          throw new AppError("Selected salary not found.", 404);
        }
      } else {
        throw new AppError("Invalid salary type. Use 'new' or 'existing'.", 400);
      }
    } else if (salary_id !== undefined) {
      const salaryExists = await SalaryModel.findById(Number(salary_id));
      if (!salaryExists) {
        throw new AppError("Selected salary not found.", 404);
      }
    }

    // ✅ NOW process salary and update in transaction (after all validations pass)
    const position = await prisma.$transaction(async (tx) => {
      if (salary_type) {
        if (salary_type === "new") {
          const normalizedAmount = normalizeSalary(salary_amount);
          const salary = await SalaryModel.createOrGet({
            amount: normalizedAmount,
          }, tx);

          updateData.salary_id = salary.salary_id;
        } else if (salary_type === "existing") {
          const salary = await SalaryModel.findById(Number(salary_id), tx);
          if (!salary) {
            throw new AppError("Selected salary not found.", 404);
          }
          updateData.salary_id = salary.salary_id;
        }
      } else if (salary_id !== undefined) {
        const salary = await SalaryModel.findById(Number(salary_id), tx);
        if (!salary) {
          throw new AppError("Selected salary not found.", 404);
        }
        updateData.salary_id = salary.salary_id;
      }

      return await PositionModel.updateById(id, updateData);
    }, {
      isolationLevel: "Serializable",
    });

    await logCrudTransaction({
      action: "Update",
      resource: "Position",
      transactedBy: getTransactedById(req),
      department_id: position.department_id,
      position_id: position.position_id,
      salary_id: position.salary_id,
    });

    res.status(200).json({
      success: true,
      message: "Position updated successfully.",
      data: position,
    });
  }
);

// DELETE
export const deletePosition = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const existing = await PositionModel.findById(id);

    if (!existing) {
      throw new AppError("Position not found.", 404);
    }

    // Perform delete and log in a single DB transaction so the delete log keeps the position reference
    await prisma.$transaction(async (tx) => {
      const actorId = getTransactedById(req);

      // Create transaction log for this deletion
      const txId = await nextIdFromMax(async () => {
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
      await PositionModel.deleteById(id, tx);
    });

    res.status(200).json({
      success: true,
      message: "Position deleted successfully.",
    });
  }
);
