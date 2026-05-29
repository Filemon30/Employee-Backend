import { Request, Response, NextFunction, RequestHandler } from "express";
import { SalaryModel } from "../models/salary.model";
import { AppError } from "../utils/http";
import { getTransactedById, logCrudTransaction } from "../utils/activity-log";

// ✅ SAFE ASYNC HANDLER (FIXED TYPE ISSUE)
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid salary ID.", 400);
  }

  return id;
};

// CREATE
export const createSalary = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const transactedBy = getTransactedById(req);

  if (!amount) {
    throw new AppError("Salary amount is required.", 400);
  }

  const normalizedAmount = String(amount).trim().replace(/,/g, "");

  if (!normalizedAmount || isNaN(Number(normalizedAmount))) {
    throw new AppError("Invalid salary amount.", 400);
  }

  const salary = await SalaryModel.createOrGet({
    amount: normalizedAmount,
  });

  await logCrudTransaction({
    action: "Create",
    resource: "Salary",
    transactedBy,
    salary_id: salary.salary_id,
  });

  return res.status(201).json({
    success: true,
    message: "Salary created successfully.",
    data: salary,
  });
});

// GET ALL
export const getAllSalaries = asyncHandler(async (_req, res) => {
  const salaries = await SalaryModel.findAll();

  return res.status(200).json({
    success: true,
    message: "Salaries retrieved successfully.",
    data: salaries,
  });
});

// GET BY ID
export const getSalaryById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  const salary = await SalaryModel.findById(id);

  if (!salary) {
    throw new AppError("Salary not found.", 404);
  }

  return res.status(200).json({
    success: true,
    message: "Salary retrieved successfully.",
    data: salary,
  });
});

// UPDATE
export const updateSalary = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { amount } = req.body;

  if (!amount) {
    throw new AppError("Salary amount is required.", 400);
  }

  const normalizedAmount = String(amount).trim().replace(/,/g, "");

  if (!normalizedAmount || isNaN(Number(normalizedAmount))) {
    throw new AppError("Invalid salary amount.", 400);
  }

  const salary = await SalaryModel.updateById(id, {
    amount: normalizedAmount,
  });

  await logCrudTransaction({
    action: "Update",
    resource: "Salary",
    transactedBy: getTransactedById(req),
    salary_id: salary.salary_id,
  });

  return res.status(200).json({
    success: true,
    message: "Salary updated successfully.",
    data: salary,
  });
});

// DELETE
export const deleteSalary = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  await SalaryModel.deleteById(id);

  await logCrudTransaction({
    action: "Delete",
    resource: "Salary",
    transactedBy: getTransactedById(req),
    salary_id: id,
  });

  return res.status(200).json({
    success: true,
    message: "Salary deleted successfully.",
  });
});