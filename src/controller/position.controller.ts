import { Request, Response } from "express";
import { PositionModel } from "../models/position.model";
import { SalaryModel } from "../models/salary.model";
import { AppError, asyncHandler } from "../utils/http";

// SAFE ID PARSER
const parseId = (rawId: unknown): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid position ID.", 400);
  }

  return id;
};

// CREATE - Handle both new and existing salary
export const createPosition = asyncHandler(
  async (req: Request, res: Response) => {
    const { department_id, position_name, salary_type, salary_amount, salary_id } = req.body;

    if (!department_id || !position_name || !salary_type) {
      throw new AppError(
        "Department ID, position name, and salary type are required.",
        400
      );
    }

    let finalSalaryId: number;

    // If salary_type is "new", create a new salary
    if (salary_type === "new") {
      if (!salary_amount) {
        throw new AppError("Salary amount is required for new salary.", 400);
      }

      const newSalary = await SalaryModel.create({
        amount: String(salary_amount),
      });

      finalSalaryId = newSalary.salary_id;
    }
    // If salary_type is "existing", use provided salary_id
    else if (salary_type === "existing") {
      if (!salary_id) {
        throw new AppError("Salary ID is required for existing salary.", 400);
      }

      const existingSalary = await SalaryModel.findById(salary_id);

      if (!existingSalary) {
        throw new AppError("Selected salary not found.", 404);
      }

      finalSalaryId = salary_id;
    } else {
      throw new AppError("Invalid salary type. Use 'new' or 'existing'.", 400);
    }

    // Check if position already exists in the department
    const existingPosition = await PositionModel.findByNameAndDepartment(
      position_name.trim(),
      department_id
    );

    if (existingPosition) {
      throw new AppError(
        `Position "${position_name}" already exists in this department.`,
        409
      );
    }

    const position = await PositionModel.create({
      department_id,
      position_name: position_name.trim(),
      salary_id: finalSalaryId,
    });

    res.status(201).json({
      success: true,
      message: "Position created successfully.",
      data: position,
    });
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
    const { department_id, position_name, salary_id } = req.body;

    const existing = await PositionModel.findById(id);

    if (!existing) {
      throw new AppError("Position not found.", 404);
    }

    const updateData: any = {};

    if (department_id) {
      updateData.department_id = department_id;
    }

    if (position_name) {
      updateData.position_name = position_name.trim();
    }

    if (salary_id) {
      const salary = await SalaryModel.findById(salary_id);

      if (!salary) {
        throw new AppError("Selected salary not found.", 404);
      }

      updateData.salary_id = salary_id;
    }

    const position = await PositionModel.updateById(id, updateData);

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

    await PositionModel.deleteById(id);

    res.status(200).json({
      success: true,
      message: "Position deleted successfully.",
    });
  }
);
