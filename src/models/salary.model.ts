import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/http";

export type CreateSalaryInput = {
  amount: string;
};

export type UpdateSalaryInput = Partial<CreateSalaryInput>;

/**
 * Normalize salary input so all formats become consistent:
 * "10,000" -> "10000"
 * " 001000 " -> "1000"
 */
function normalizeSalary(amount: unknown): string {
  return String(amount)
    .trim()
    .replace(/,/g, "")
    .replace(/^0+(?=\d)/, "");
}

export class SalaryModel {
  /**
   * CREATE OR GET (no duplicates ever)
   */
  static async createOrGet(
    data: CreateSalaryInput,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    const normalizedAmount = normalizeSalary(data.amount);

    const existing = await client.salaries.findFirst({
      where: { amount: normalizedAmount },
      include: { positions: true },
    });

    if (existing) {
      return existing;
    }

    const salaryId = await nextIdFromMax(async () => {
      const result = await client.salaries.aggregate({
        _max: { salary_id: true },
      });
      return result._max.salary_id;
    });

    try {
      return await client.salaries.create({
        data: {
          salary_id: salaryId,
          amount: normalizedAmount,
        },
        include: { positions: true },
      });
    } catch (err) {
      const maybePrisma = err as Prisma.PrismaClientKnownRequestError;
      if (maybePrisma?.code === "P2002") {
        // Unique constraint failed (race) -> return existing salary record
        const existingAfterRace = await client.salaries.findFirst({
          where: { amount: normalizedAmount },
          include: { positions: true },
        });

        if (existingAfterRace) {
          return existingAfterRace;
        }

        throw new AppError("Salary amount already exists.", 409);
      }

      throw err;
    }
  }

  /**
   * GET ALL
   */
  static findAll() {
    return prisma.salaries.findMany({
      include: { positions: true },
      orderBy: { salary_id: "asc" },
    });
  }

  /**
   * GET BY ID (with optional transaction client)
   */
  static findById(salaryId: number, client: Prisma.TransactionClient | typeof prisma = prisma) {
    return client.salaries.findUnique({
      where: { salary_id: salaryId },
      include: { positions: true },
    });
  }

  /**
   * GET BY AMOUNT (normalized)
   */
  static findByAmount(amount: string) {
    const normalizedAmount = normalizeSalary(amount);

    return prisma.salaries.findFirst({
      where: { amount: normalizedAmount },
      include: { positions: true },
    });
  }

  /**
   * UPDATE (prevents duplicates properly)
   */
  static async updateById(salaryId: number, data: UpdateSalaryInput) {
    let normalizedAmount: string | undefined;

    if (data.amount) {
      normalizedAmount = normalizeSalary(data.amount);

      const existing = await prisma.salaries.findFirst({
        where: {
          amount: normalizedAmount,
          NOT: { salary_id: salaryId },
        },
      });

      if (existing) {
        throw new Error("Salary amount already exists.");
      }
    }

    try {
      return await prisma.salaries.update({
        where: { salary_id: salaryId },
        data: {
          ...data,
          amount: normalizedAmount ?? data.amount,
        },
        include: { positions: true },
      });
    } catch (err) {
      const maybePrisma = err as Prisma.PrismaClientKnownRequestError;
      if (maybePrisma?.code === "P2002") {
        throw new AppError("Salary amount already exists.", 409);
      }

      throw err;
    }
  }

  /**
   * DELETE (blocked if used)
   */
  static async deleteById(salaryId: number) {
    const used = await prisma.positions.findFirst({
      where: { salary_id: salaryId },
    });

    if (used) {
      throw new Error(
        "Cannot delete salary. It is currently used by one or more positions."
      );
    }

    return prisma.salaries.delete({
      where: { salary_id: salaryId },
    });
  }
}