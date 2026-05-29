import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/http";

export type CreatePositionInput = {
  department_id: number;
  salary_id: number;
  position_name: string;
};

export type UpdatePositionInput = Partial<CreatePositionInput>;

export class PositionModel {
  // CREATE
  static async create(
    data: CreatePositionInput,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    // 🔒 Enforce uniqueness inside model (not controller)
    const existing = await client.positions.findFirst({
      where: {
        department_id: data.department_id,
        position_name: data.position_name,
      },
    });

    if (existing) {
      throw new AppError(
        `Position "${data.position_name}" already exists in this department.`,
        409
      );
    }

    const positionId = await nextIdFromMax(async () => {
      const result = await client.positions.aggregate({
        _max: { position_id: true },
      });
      return result._max.position_id;
    });

    try {
      return await client.positions.create({
        data: {
          position_id: positionId,
          ...data,
        },
        include: { departments: true, salaries: true, employees: true },
      });
    } catch (err) {
      const maybePrisma = err as Prisma.PrismaClientKnownRequestError;
      if (maybePrisma?.code === "P2002") {
        throw new AppError(
          `Position "${data.position_name}" already exists in this department.`,
          409
        );
      }

      throw err;
    }
  }

  // READ ALL
  static findAll() {
    return prisma.positions.findMany({
      include: { departments: true, salaries: true, employees: true },
      orderBy: { position_id: "asc" },
    });
  }

  // READ ONE
  static findById(positionId: number) {
    return prisma.positions.findUnique({
      where: { position_id: positionId },
      include: { departments: true, salaries: true, employees: true },
    });
  }

  static findByNameAndDepartment(position_name: string, department_id: number) {
    return prisma.positions.findFirst({
      where: {
        position_name,
        department_id,
      },
    });
  }

  // UPDATE
  static async updateById(positionId: number, data: UpdatePositionInput) {
    // 🔒 If changing name or department, enforce uniqueness
    if (data.position_name || data.department_id) {
      const current = await prisma.positions.findUnique({
        where: { position_id: positionId },
      });

      if (!current) throw new AppError("Position not found.", 404);

      const nameToCheck = data.position_name ?? current.position_name;
      const deptToCheck = data.department_id ?? current.department_id;

      const duplicate = await prisma.positions.findFirst({
        where: {
          position_name: nameToCheck,
          department_id: deptToCheck,
          NOT: { position_id: positionId },
        },
      });

      if (duplicate) {
        throw new AppError(
          `Position "${nameToCheck}" already exists in this department.`,
          409
        );
      }
    }

    try {
      return await prisma.positions.update({
        where: { position_id: positionId },
        data,
        include: { departments: true, salaries: true, employees: true },
      });
    } catch (err) {
      const maybePrisma = err as Prisma.PrismaClientKnownRequestError;
      if (maybePrisma?.code === "P2002") {
        throw new AppError(
          `Position "${data.position_name ?? ""}" already exists in this department.`,
          409
        );
      }

      throw err;
    }
  }

  // DELETE
  static async deleteById(
    positionId: number,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return await client.$transaction(async (tx) => {
      // Clear any employees still assigned to this position
      await tx.employees.updateMany({
        where: { position_id: positionId },
        data: { position_id: null },
      });

      return await tx.positions.delete({
        where: { position_id: positionId },
      });
    });
  }
}