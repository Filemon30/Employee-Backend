import { prisma } from "../config/db";
import { nextIdFromMax } from "../utils/next-id";

export type CreateWorkHourInput = {
  time_in: string;
  time_out: string;
  classification?: string;
  lunch_break_minutes?: number;
};

export type UpdateWorkHourInput = Partial<CreateWorkHourInput>;

export class WorkHourModel {
  static async create(data: CreateWorkHourInput) {
    const workHourId = await nextIdFromMax(async () => {
      const result = await prisma.work_hours.aggregate({
        _max: { work_hour_id: true },
      });

      return result._max.work_hour_id;
    });

    return prisma.work_hours.create({
      data: {
        work_hour_id: workHourId,
        ...data,
      },
      include: { morning_employees: true, afternoon_employees: true },
    });
  }

  static findAll() {
    return prisma.work_hours.findMany({
      include: { morning_employees: true, afternoon_employees: true },
      orderBy: { work_hour_id: "asc" },
    });
  }

  static findById(workHourId: number) {
    return prisma.work_hours.findUnique({
      where: { work_hour_id: workHourId },
      include: { morning_employees: true, afternoon_employees: true },
    });
  }

  static findByTimeRange(timeIn: string, timeOut: string) {
    return prisma.work_hours.findFirst({
      where: {
        time_in: timeIn,
        time_out: timeOut,
      },
      include: { morning_employees: true, afternoon_employees: true },
    });
  }

  static findByTimeRangeExcludingId(
    timeIn: string,
    timeOut: string,
    workHourId: number
  ) {
    return prisma.work_hours.findFirst({
      where: {
        time_in: timeIn,
        time_out: timeOut,
        work_hour_id: {
          not: workHourId,
        },
      },
      include: { morning_employees: true, afternoon_employees: true },
    });
  }

  static updateById(workHourId: number, data: UpdateWorkHourInput) {
    return prisma.work_hours.update({
      where: { work_hour_id: workHourId },
      data,
      include: { morning_employees: true, afternoon_employees: true },
    });
  }

  static deleteById(workHourId: number) {
    return prisma.work_hours.delete({
      where: { work_hour_id: workHourId },
    });
  }
}
