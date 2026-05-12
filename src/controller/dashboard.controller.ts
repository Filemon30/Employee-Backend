import { Request, Response } from "express";
import { prisma } from "../config/db";
import { AppError, asyncHandler } from "../utils/http";

export const dashboardController = {
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    // Get current date in UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count total employees
    const totalEmployees = await prisma.employees.count();

    // Count total departments
    const totalDepartments = await prisma.departments.count();

    // Count present attendances for today
    const totalPresent = await prisma.attendances.count({
      where: {
        attendance_date: {
          gte: today,
          lt: tomorrow,
        },
        status: "Present",
      },
    });

    // Count absent attendances for today
    const totalAbsent = await prisma.attendances.count({
      where: {
        attendance_date: {
          gte: today,
          lt: tomorrow,
        },
        status: "Absent",
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

  getRecentAttendances: asyncHandler(async (_req: Request, res: Response) => {
    // Get current date in UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch recent attendances for today with employee info
    const attendances = await prisma.attendances.findMany({
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
      
      return {
        fullName,
        status: attendance.status,
        timeIn: attendance.time_in?.toLocaleTimeString("en-US", { 
          hour: "2-digit", 
          minute: "2-digit",
          hour12: true 
        }) || "N/A",
      };
    });

    res.status(200).json({
      success: true,
      data: formattedAttendances,
    });
  }),

  getRecentTransactions: asyncHandler(async (_req: Request, res: Response) => {
    // Fetch recent transactions
    const transactions = await prisma.transactions.findMany({
      orderBy: {
        transaction_date: "desc",
      },
      take: 5,
    });

    // Format the response
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

      return {
        reference: `${transaction.transaction_id}`.padStart(6, "0"),
        type: transaction.transaction_type,
        by: "HR",
        dateTime,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedTransactions,
    });
  }),
};

