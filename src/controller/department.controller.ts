import { Request, Response } from "express";
import { DepartmentModel } from "../models/department.model";
import { AppError, asyncHandler } from "../utils/http";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid department ID.", 400);
  }

  return id;
};

// CREATE
export const createDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { department_name } = req.body;

    if (!department_name) {
      throw new AppError("Department name is required.", 400);
    }

    const department = await DepartmentModel.create({
      department_name: department_name,
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

    const department = await DepartmentModel.updateById(id, req.body);

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

    if (!existing) {
      throw new AppError("Department not found.", 404);
    }

    await DepartmentModel.deleteById(id);

    res.status(200).json({ 
      success: true,
      message: "Department deleted successfully." 
    });
  }
);


