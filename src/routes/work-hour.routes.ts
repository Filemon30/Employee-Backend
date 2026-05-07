import { Router } from "express";
import {
  createWorkHour,
  getAllWorkHours,
  getWorkHourById,
  updateWorkHour,
  deleteWorkHour,
} from "../controller/work-hour.controller";

const workHourRouter = Router();

workHourRouter.post("/", createWorkHour);
workHourRouter.get("/", getAllWorkHours);
workHourRouter.get("/:id", getWorkHourById);
workHourRouter.put("/:id", updateWorkHour);
workHourRouter.delete("/:id", deleteWorkHour);

export { workHourRouter };
