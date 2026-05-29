"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = void 0;
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
exports.dashboardController = {
    getStats: (0, http_1.asyncHandler)(async (_req, res) => {
        // Get current date in UTC
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Count total employees
        const totalEmployees = await db_1.prisma.employees.count();
        // Count total departments
        const totalDepartments = await db_1.prisma.departments.count();
        // Count present attendances for today (has at least one check-in)
        const totalPresent = await db_1.prisma.attendances.count({
            where: {
                attendance_date: {
                    gte: today,
                    lt: tomorrow,
                },
                OR: [
                    { morning_time_in: { not: null } },
                    { morning_time_out: { not: null } },
                    { afternoon_time_in: { not: null } },
                    { afternoon_time_out: { not: null } },
                ],
            },
        });
        // Count absent attendances for today (no check-ins at all)
        const totalAbsent = await db_1.prisma.attendances.count({
            where: {
                attendance_date: {
                    gte: today,
                    lt: tomorrow,
                },
                morning_time_in: null,
                morning_time_out: null,
                afternoon_time_in: null,
                afternoon_time_out: null,
            },
        });
        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                totalPresent,
                totalAbsent,
                totalDepartments,
            },
        });
    }),
    getRecentAttendances: (0, http_1.asyncHandler)(async (_req, res) => {
        // Get current date in UTC
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Fetch recent attendances for today with employee info
        const attendances = await db_1.prisma.attendances.findMany({
            where: {
                attendance_date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                employees: {
                    include: {
                        user_informations: true,
                    },
                },
            },
            orderBy: {
                attendance_id: "desc",
            },
            take: 5,
        });
        // Format the response
        const formattedAttendances = attendances.map((attendance) => {
            const userInfo = attendance.employees.user_informations;
            const fullName = `${userInfo?.last_name || ""}, ${userInfo?.first_name || ""} ${userInfo?.suffix || ""}`.trim();
            // Get the first time entry available
            const firstTimeEntry = attendance.morning_time_in || attendance.morning_time_out || attendance.afternoon_time_in || attendance.afternoon_time_out;
            const timeIn = firstTimeEntry?.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }) || "N/A";
            // Determine status based on which times are filled
            let status = "Absent";
            if (firstTimeEntry) {
                status = "Present";
            }
            return {
                fullName,
                status,
                timeIn,
            };
        });
        res.status(200).json({
            success: true,
            data: formattedAttendances,
        });
    }),
    getRecentTransactions: (0, http_1.asyncHandler)(async (_req, res) => {
        const transactions = await db_1.prisma.transactions.findMany({
            orderBy: {
                transaction_date: "desc",
            },
            take: 5,
        });
        const transactedByIds = Array.from(new Set(transactions.map((transaction) => transaction.transacted_by)));
        const transactedByEmployees = await db_1.prisma.employees.findMany({
            where: { employee_id: { in: transactedByIds } },
            include: { user_informations: true },
        });
        const employeesById = new Map(transactedByEmployees.map((employee) => [employee.employee_id, employee]));
        const formattedTransactions = transactions.map((transaction) => {
            const dateTime = transaction.transaction_date?.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            }) || "N/A";
            const transactedBy = employeesById.get(transaction.transacted_by);
            const firstName = transactedBy?.user_informations?.first_name || "Unknown";
            return {
                reference: `${transaction.transaction_id}`.padStart(8, "0"),
                type: transaction.transaction_type,
                firstName,
                dateTime,
            };
        });
        res.status(200).json({
            success: true,
            data: formattedTransactions,
        });
    }),
};
