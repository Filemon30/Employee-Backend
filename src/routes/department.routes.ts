import { Router } from "express";
import { 
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} from "../controller/department.controller";

const departmentRouter = Router();

departmentRouter.post("/", createDepartment);
departmentRouter.get("/", getAllDepartments);
departmentRouter.get("/:id", getDepartmentById);
departmentRouter.put("/:id", updateDepartment);
departmentRouter.delete("/:id", deleteDepartment);


export { departmentRouter };