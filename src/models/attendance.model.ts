import { prisma } from "../config/db";
import { AttendanceStatus } from "./enums.model";
import { nextIdFromMax } from "../utils/next-id";

export type CreateAttendanceInput = {
  employee_id: number;
  attendance_date: Date;
  time_in?: Date;
  time_out?: Date;
  status: AttendanceStatus;
};

export type UpdateAttendanceInput = Partial<CreateAttendanceInput>;

export class AttendanceModel {
  static async create(data: CreateAttendanceInput) {
    const attendanceId = await nextIdFromMax(async () => {
      const result = await prisma.attendances.aggregate({
        _max: { attendance_id: true },
      });

      return result._max.attendance_id;
    });

    return prisma.attendances.create({
      data: {
        attendance_id: attendanceId,
        ...data,
      },
      include: { employees: true },
    });
  }

  static findAll() {
    return prisma.attendances.findMany({
      include: { employees: true },
      orderBy: [{ attendance_date: "desc" }, { attendance_id: "asc" }],
    });
  }

  static findById(attendanceId: number) {
    return prisma.attendances.findUnique({
      where: { attendance_id: attendanceId },
      include: { employees: true },
    });
  }

  static updateById(attendanceId: number, data: UpdateAttendanceInput) {
    return prisma.attendances.update({
      where: { attendance_id: attendanceId },
      data,
      include: { employees: true },
    });
  }

  static deleteById(attendanceId: number) {
    return prisma.attendances.delete({
      where: { attendance_id: attendanceId },
    });
  }
}
