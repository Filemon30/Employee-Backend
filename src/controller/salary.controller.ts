import { Request, Response } from "express";
import { SalaryModel } from "../models/salary.model";
import { AppError, asyncHandler } from "../utils/http";
import { getTransactedById, logCrudTransaction } from "../utils/activity-log";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid salary ID.", 400);
  }

  return id;
};

// CREATE
export const createSalary = asyncHandler(
  async (req: Request, res: Response) => {
    const { amount } = req.body;
    const transactedBy = getTransactedById(req);

    if (!amount) {
      throw new AppError("Salary amount is required.", 400);
    }

    const salary = await SalaryModel.create({
      amount: String(amount),
    });

    await logCrudTransaction({
      action: "Create",
      resource: "Salary",
      transactedBy,
      salary_id: salary.salary_id,
    });

    res.status(201).json({
      success: true,
      message: "Salary created successfully.",
      data: salary,
    });
  }
);

// GET ALL
export const getAllSalaries = asyncHandler(
  async (_req: Request, res: Response) => {
    const salaries = await SalaryModel.findAll();

    res.status(200).json({
      success: true,
      message: "Salaries retrieved successfully.",
      data: salaries,
    });
  }
);

// GET BY ID
export const getSalaryById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const salary = await SalaryModel.findById(id);

    if (!salary) {
      throw new AppError("Salary not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Salary retrieved successfully.",
      data: salary,
    });
  }
);

// UPDATE
export const updateSalary = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const { amount } = req.body;

    const existing = await SalaryModel.findById(id);

    if (!existing) {
      throw new AppError("Salary not found.", 404);
    }

    if (!amount) {
      throw new AppError("Salary amount is required.", 400);
    }

    const salary = await SalaryModel.updateById(id, {
      amount: String(amount),
    });

    await logCrudTransaction({
      action: "Update",
      resource: "Salary",
      transactedBy: getTransactedById(req),
      salary_id: salary.salary_id,
    });

    res.status(200).json({
      success: true,
      message: "Salary updated successfully.",
      data: salary,
    });
  }
);

// DELETE
export const deleteSalary = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);

    const existing = await SalaryModel.findById(id);

    if (!existing) {
      throw new AppError("Salary not found.", 404);
    }

    await SalaryModel.deleteById(id);

    await logCrudTransaction({
      action: "Delete",
      resource: "Salary",
      transactedBy: getTransactedById(req),
      salary_id: id,
    });

    res.status(200).json({
      success: true,
      message: "Salary deleted successfully.",
    });
  }
);
