import { Router } from "express";
import { authRouter } from "./auth.routes";
import { departmentRouter } from "./department.routes";
import { employeeRouter } from "./employee.routes";
import { positionRouter } from "./position.routes";
import { salaryRouter } from "./salary.routes";
import { workHourRouter } from "./work-hour.routes";
import { dashboardRouter } from "./dashboard.routes";
import { transactionRouter } from "./transaction.routes";


const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Attendance Management server is running.",
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/departments", departmentRouter);
apiRouter.use("/employees", employeeRouter);
apiRouter.use("/positions", positionRouter);
apiRouter.use("/salaries", salaryRouter);
apiRouter.use("/work-hours", workHourRouter);
apiRouter.use("/transactions", transactionRouter);

export { apiRouter };