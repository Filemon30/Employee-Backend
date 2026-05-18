import type { Request } from "express";
import { AppError } from "./http";
import { TransactionModel } from "../models/transaction.model";

type CrudAction = "Create" | "Update" | "Delete" | "New";
type CrudResource = "Department" | "Position" | "Salary" | "Work Hour" | "Employee";

const parseRequiredId = (rawId: unknown, fieldName: string): number => {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!id || isNaN(id)) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  return id;
};

export const getTransactedById = (req: Request): number => {
  return parseRequiredId(req.body?.transacted_by ?? req.query.transacted_by, "transacted_by");
};

type LogCrudTransactionInput = {
  action: CrudAction;
  resource: CrudResource;
  transactedBy: number;
  department_id?: number;
  position_id?: number;
  salary_id?: number;
  work_hour_id?: number;
  employee_id?: number;
};

export const logCrudTransaction = async (input: LogCrudTransactionInput) => {
  try {
    return await TransactionModel.create({
      transaction_type: `${input.resource} ${input.action}`,
      transacted_by: input.transactedBy,
      reference_type: input.resource,
      department_id: input.department_id,
      position_id: input.position_id,
      salary_id: input.salary_id,
      work_hour_id: input.work_hour_id,
      employee_id: input.employee_id,
    });
  } catch (error) {
    console.error("Failed to log transaction:", error);
    return null;
  }
};