"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class AttendanceModel {
    static async create(data) {
        const attendanceId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.attendances.aggregate({
                _max: { attendance_id: true },
            });
            return result._max.attendance_id;
        });
        return db_1.prisma.attendances.create({
            data: {
                attendance_id: attendanceId,
                ...data,
            },
            include: { employees: true },
        });
    }
    static findAll() {
        return db_1.prisma.attendances.findMany({
            include: { employees: true },
            orderBy: [{ attendance_date: "desc" }, { attendance_id: "asc" }],
        });
    }
    static findById(attendanceId) {
        return db_1.prisma.attendances.findUnique({
            where: { attendance_id: attendanceId },
            include: { employees: true },
        });
    }
    static updateById(attendanceId, data) {
        return db_1.prisma.attendances.update({
            where: { attendance_id: attendanceId },
            data,
            include: { employees: true },
        });
    }
    static deleteById(attendanceId) {
        return db_1.prisma.attendances.delete({
            where: { attendance_id: attendanceId },
        });
    }
}
exports.AttendanceModel = AttendanceModel;
