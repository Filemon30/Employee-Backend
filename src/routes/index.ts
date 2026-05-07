import { Router } from "express";
import { departmentRouter } from "./department.routes";
import { employeeRouter } from "./employee.routes";
import { positionRouter } from "./position.routes";
import { salaryRouter } from "./salary.routes";
import { workHourRouter } from "./work-hour.routes";


const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Attendance Management server is running.",
  });
});

apiRouter.use("/departments", departmentRouter);
apiRouter.use("/employees", employeeRouter);
apiRouter.use("/positions", positionRouter);
apiRouter.use("/salaries", salaryRouter);
apiRouter.use("/work-hours", workHourRouter);

export { apiRouter };