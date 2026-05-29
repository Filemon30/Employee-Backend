import { Request, Response } from "express";
import { DepartmentModel } from "../models/department.model";
import { EmployeeModel } from "../models/employee.model";
import { PositionModel } from "../models/position.model";
import { prisma } from "../config/db";
import { AppError, asyncHandler } from "../utils/http";
import { getTransactedById, logCrudTransaction } from "../utils/activity-log";
import { nextIdFromMax } from "../utils/next-id";
import { generateRandomId } from "../utils/idGenerator/id-generator";

const DEPARTMENT_HEAD_POSITION_NAME = "Department Head";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid department ID.", 400);
  }

  return id;
};

const parseOptionalId = (rawId: unknown): number | null | undefined => {
  if (rawId === undefined) {
    return undefined;
  }

  if (rawId === null || rawId === "") {
    return null;
  }

  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid department head ID.", 400);
  }

  return id;
};


// CREATE
export const createDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { department_name, department_head } = req.body;
    const transactedBy = getTransactedById(req);

    if (!department_name) {
      throw new AppError("Department name is required.", 400);
    }

    const parsedDepartmentHead = parseOptionalId(department_head);

    if (typeof parsedDepartmentHead === "number") {
      const headEmployee = await EmployeeModel.findById(parsedDepartmentHead);
      if (!headEmployee) throw new AppError("Department head not found.", 404);
    }

    const department = await DepartmentModel.create({
      department_name: department_name,
      department_head: parsedDepartmentHead ?? null,
    });

    await logCrudTransaction({
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
  }
);

export const getAllDepartments = asyncHandler(
  async (req: Request, res: Response) => {
    const departments = await DepartmentModel.findAll();

    res.status(200).json({
      success: true,
      message: "Departments retrieved successfully.",
      data: departments,
    });
  }
);

export const getDepartmentById = asyncHandler (
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const department = await DepartmentModel.findById(id);

    if (!department) {
      throw new AppError("Department not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Department retrieved successfully.",
      data: department,
    });
  }
);

export const updateDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const existing = await DepartmentModel.findById(id);

    if (!existing) {
      throw new AppError("Department not found.", 404);
    }

    const updateData: {
      department_name?: string;
      department_head?: number | null;
    } = {};

    if (req.body.department_name !== undefined) {
      updateData.department_name = req.body.department_name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "department_head")) {
      const parsedDepartmentHead = parseOptionalId(req.body.department_head);

      if (typeof parsedDepartmentHead === "number") {
        const headEmployee = await EmployeeModel.findById(parsedDepartmentHead);
        if (!headEmployee) throw new AppError("Department head not found.", 404);


        const transactionSteps = [];

        if (existing.department_head && existing.department_head !== parsedDepartmentHead) {
          transactionSteps.push(
            prisma.employees.update({ where: { employee_id: existing.department_head }, data: { position_id: null } })
          );
        }

        transactionSteps.push(
          prisma.departments.update({ where: { department_id: id }, data: { department_head: parsedDepartmentHead } })
        );

        // Execute transaction
        await prisma.$transaction(transactionSteps);

        const updated = await DepartmentModel.findById(id);

        await logCrudTransaction({
          action: "Update",
          resource: "Department",
          transactedBy: getTransactedById(req),
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
          transactionSteps.push(
            prisma.employees.update({ where: { employee_id: existing.department_head }, data: { position_id: null } })
          );
        }
        transactionSteps.push(
          prisma.departments.update({ where: { department_id: id }, data: { department_head: null } })
        );
        await prisma.$transaction(transactionSteps);

        const updated = await DepartmentModel.findById(id);

        await logCrudTransaction({
          action: "Update",
          resource: "Department",
          transactedBy: getTransactedById(req),
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

    const department = await DepartmentModel.updateById(id, updateData);

    await logCrudTransaction({
      action: "Update",
      resource: "Department",
      transactedBy: getTransactedById(req),
      department_id: department.department_id,
    });

    res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: department,
    });
  }
);

export const deleteDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const existing = await DepartmentModel.findById(id);

    if(!existing) {
      throw new AppError("Department not found.", 404);
    }

    await prisma.$transaction(async (tx) => {
      const actorId = getTransactedById(req);

      const txId = await nextIdFromMax(async () => {
        const result = await tx.transactions.aggregate({_max: { transaction_id: true } })
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

      await DepartmentModel.deleteById(id);
    
    });

    res.status(200).json({
      success: true,
      message: "Department deleted successfully.",
    });

  }
);