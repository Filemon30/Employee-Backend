"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeRouter = void 0;
const express_1 = require("express");
const employee_controller_1 = require("../controller/employee.controller");
exports.employeeRouter = (0, express_1.Router)();
// CREATE
exports.employeeRouter.post("/", employee_controller_1.createEmployee);
// READ
exports.employeeRouter.get("/", employee_controller_1.getAllEmployees);
exports.employeeRouter.get("/:id", employee_controller_1.getEmployeeById);
// UPDATE
exports.employeeRouter.put("/:id", employee_controller_1.updateEmployee);
// DELETE
exports.employeeRouter.delete("/:id", employee_controller_1.deleteEmployee);
