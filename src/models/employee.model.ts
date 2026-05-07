import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreateEmployeeInput = {
  position_id: number;
  card_id: number;
  acc_id: number;
  info_id: number;
  work_hour_id: number;
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

    return prisma.employees.create({
      data: {
        employee_id: employeeId,
        ...data,
      },
      include: {
        cards: true,
        positions: true,
        user_accounts: true,
        user_informations: true,
        work_hours: true,
        attendances: true,
      },
    });
  }

  static findAll() {
    return prisma.employees.findMany({
      include: {
        cards: true,
        positions: true,
        user_accounts: true,
        user_informations: true,
        work_hours: true,
        attendances: true,
      },
      orderBy: { employee_id: "asc" },
    });
  }

  static findById(employeeId: number) {
    return prisma.employees.findUnique({
      where: { employee_id: employeeId },
      include: {
        cards: true,
        positions: true,
        user_accounts: true,
        user_informations: true,
        work_hours: true,
        attendances: true,
      },
    });
  }

  static updateById(employeeId: number, data: UpdateEmployeeInput) {
    return prisma.employees.update({
      where: { employee_id: employeeId },
      data,
      include: {
        cards: true,
        positions: true,
        user_accounts: true,
        user_informations: true,
        work_hours: true,
        attendances: true,
      },
    });
  }

  static deleteById(employeeId: number) {
    return prisma.employees.delete({
      where: { employee_id: employeeId },
    });
  }
}
