import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controller/employee.controller";

export const employeeRouter = Router();

// CREATE
employeeRouter.post("/", createEmployee);

// READ
employeeRouter.get("/", getAllEmployees);
employeeRouter.get("/:id", getEmployeeById);

// UPDATE
employeeRouter.put("/:id", updateEmployee);

// DELETE
employeeRouter.delete("/:id", deleteEmployee);
