import { Router } from "express";
import { dashboardController } from "../controller/dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.get("/stats", dashboardController.getStats);
dashboardRouter.get("/recent-attendances", dashboardController.getRecentAttendances);
dashboardRouter.get("/recent-transactions", dashboardController.getRecentTransactions);

export { dashboardRouter };
