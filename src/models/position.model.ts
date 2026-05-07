import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreatePositionInput = {
  department_id: number;
  salary_id: number;
  position_name: string;
};

export type UpdatePositionInput = Partial<CreatePositionInput>;

export class PositionModel {
  static async create(data: CreatePositionInput) {
    const positionId = await nextIdFromMax(async () => {
      const result = await prisma.positions.aggregate({
        _max: { position_id: true },
      });

      return result._max.position_id;
    });

    return prisma.positions.create({
      data: {
        position_id: positionId,
        ...data,
      },
      include: { departments: true, salaries: true, employees: true },
    });
  }

  static findAll() {
    return prisma.positions.findMany({
      include: { departments: true, salaries: true, employees: true },
      orderBy: { position_id: "asc" },
    });
  }

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

  static updateById(positionId: number, data: UpdatePositionInput) {
    return prisma.positions.update({
      where: { position_id: positionId },
      data,
      include: { departments: true, salaries: true, employees: true },
    });
  }

  static deleteById(positionId: number) {
    return prisma.positions.delete({
      where: { position_id: positionId },
    });
  }
}
