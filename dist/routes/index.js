"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const department_routes_1 = require("./department.routes");
const employee_routes_1 = require("./employee.routes");
const position_routes_1 = require("./position.routes");
const salary_routes_1 = require("./salary.routes");
const work_hour_routes_1 = require("./work-hour.routes");
const apiRouter = (0, express_1.Router)();
exports.apiRouter = apiRouter;
apiRouter.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Employee Attendance Management server is running.",
    });
});
apiRouter.use("/departments", department_routes_1.departmentRouter);
apiRouter.use("/employees", employee_routes_1.employeeRouter);
apiRouter.use("/positions", position_routes_1.positionRouter);
apiRouter.use("/salaries", salary_routes_1.salaryRouter);
apiRouter.use("/work-hours", work_hour_routes_1.workHourRouter);
