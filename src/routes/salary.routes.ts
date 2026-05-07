import { Router } from "express";
import { 
    createSalary,
    getAllSalaries,
    getSalaryById,
    updateSalary,
    deleteSalary
} from "../controller/salary.controller";

const salaryRouter = Router();

salaryRouter.post("/", createSalary);
salaryRouter.get("/", getAllSalaries);
salaryRouter.get("/:id", getSalaryById);
salaryRouter.put("/:id", updateSalary);
salaryRouter.delete("/:id", deleteSalary);

export { salaryRouter };