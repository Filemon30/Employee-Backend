import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreateSalaryInput = {
  amount: string;
};

export type UpdateSalaryInput = Partial<CreateSalaryInput>;

export class SalaryModel {
  static async create(data: CreateSalaryInput) {
    const salaryId = await nextIdFromMax(async () => {
      const result = await prisma.salaries.aggregate({
        _max: { salary_id: true },
      });

      return result._max.salary_id;
    });

    return prisma.salaries.create({
      data: {
        salary_id: salaryId,
        ...data,
      },
      include: { positions: true },
    });
  }

  static findAll() {
    return prisma.salaries.findMany({
      include: { positions: true },
      orderBy: { salary_id: "asc" },
    });
  }

  static findById(salaryId: number) {
    return prisma.salaries.findUnique({
      where: { salary_id: salaryId },
      include: { positions: true },
    });
  }

  static updateById(salaryId: number, data: UpdateSalaryInput) {
    return prisma.salaries.update({
      where: { salary_id: salaryId },
      data,
      include: { positions: true },
    });
  }

  static deleteById(salaryId: number) {
    return prisma.salaries.delete({
      where: { salary_id: salaryId },
    });
  }
}
