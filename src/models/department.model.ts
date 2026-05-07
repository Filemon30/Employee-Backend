import { prisma } from "../config/db";
import { AppError } from "../utils/http";
import { nextIdFromMax } from "../utils/next-id";

export type CreateDepartmentInput = {
  department_name: string;
};

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export class DepartmentModel {
  // CREATE
  static async create(data: CreateDepartmentInput) {
    const name = data.department_name.trim();
    const departmentId = await nextIdFromMax(async () => {
      const result = await prisma.departments.aggregate({
        _max: { department_id: true },
      });

      return result._max.department_id;
    });

    // IMPORTANT FIX: use findFirst instead of findUnique
    const existing = await prisma.departments.findFirst({
      where: {
        department_name: name,
      },
    });

    if (existing) {
      throw new AppError("Department already exists.", 409);
    }

    return prisma.departments.create({
      data: {
        department_id: departmentId,
        department_name: name,
      },
      include: {
        positions: {
          include: {
            salaries: true,
          },
        },
      },
    });
  }

  // GET ALL
  static findAll() {
    return prisma.departments.findMany({
      include: {
        positions: {
          include: {
            salaries: true,
          },
        },
      },
      orderBy: { department_id: "asc" },
    });
  }

  // GET BY ID
  static findById(departmentId: number) {
    return prisma.departments.findUnique({
      where: {
        department_id: departmentId,
      },
      include: {
        positions: {
          include: {
            salaries: true,
          },
        },
      },
    });
  }

  // UPDATE
  static async updateById(departmentId: number, data: UpdateDepartmentInput) {
    const id = departmentId;

    const updateData: any = {};

    if (data.department_name) {
      const name = data.department_name.trim();

      const existing = await prisma.departments.findFirst({
        where: {
          department_name: name,
          NOT: { department_id: id },
        },
      });

      if (existing) {
        throw new AppError("Department already exists.", 409);
      }

      updateData.department_name = name;
    }

    return prisma.departments.update({
      where: { department_id: id },
      data: updateData,
      include: {
        positions: {
          include: {
            salaries: true,
          },
        },
      },
    });
  }

  // DELETE
  static deleteById(departmentId: number) {
    return prisma.departments.delete({
      where: {
        department_id: departmentId,
      },
    });
  }
}