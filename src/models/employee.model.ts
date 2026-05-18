import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";
import type { Prisma } from "@prisma/client";

export type CreateEmployeeInput = {
  position_id?: number | null;
  card_id?: number;
  acc_id: number;
  info_id: number;
  morning_work_hour_id?: number | null;
  afternoon_work_hour_id?: number | null;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export class EmployeeModel {
  static async create(data: CreateEmployeeInput) {
    const employeeId = await nextIdFromMax(async () => {
      const result = await prisma.employees.aggregate({
        _max: { employee_id: true },
      });

      return result._max.employee_id;
    });

    const baseData = {
        employee_id: employeeId,
        position_id: data.position_id,
        card_id: data.card_id ?? null,
        acc_id: data.acc_id,
        info_id: data.info_id,
        morning_work_hour_id: data.morning_work_hour_id ?? null,
        afternoon_work_hour_id: data.afternoon_work_hour_id ?? null,
      } as unknown as Prisma.employeesUncheckedCreateInput;
    return prisma.employees.create({
      data: baseData,
      include: {
        cards: true,
        positions: {
          include: {
            departments: true,
            salaries: true,
          },
        },
        user_accounts: true,
        user_informations: true,
        attendances: true,
        morning_work_hour: true,
        afternoon_work_hour: true,
      },
    });
  }

  static findAll() {
    return prisma.employees.findMany({
      include: {
        cards: true,
        positions: {
          include: {
            departments: true,
            salaries: true,
          },
        },
        user_accounts: true,
        user_informations: true,
        attendances: true,
        morning_work_hour: true,
        afternoon_work_hour: true,
      },
      orderBy: { employee_id: "asc" },
    });
  }

  static findById(employeeId: number) {
    return prisma.employees.findUnique({
      where: { employee_id: employeeId },
      include: {
        cards: true,
        positions: {
          include: {
            departments: true,
            salaries: true,
          },
        },
        user_accounts: true,
        user_informations: true,
        attendances: true,
        morning_work_hour: true,
        afternoon_work_hour: true,
      },
    });
  }

  static updateById(employeeId: number, data: UpdateEmployeeInput) {
    return prisma.employees.update({
      where: { employee_id: employeeId },
      data,
      include: {
        cards: true,
        positions: {
          include: {
            departments: true,
            salaries: true,
          },
        },
        user_accounts: true,
        user_informations: true,
        attendances: true,
        morning_work_hour: true,
        afternoon_work_hour: true,
      },
    });
  }

  static deleteById(employeeId: number) {
    return prisma.employees.delete({
      where: { employee_id: employeeId },
    });
  }
}
