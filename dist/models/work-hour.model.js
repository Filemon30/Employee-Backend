"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkHourModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class WorkHourModel {
    static async create(data) {
        const workHourId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.work_hours.aggregate({
                _max: { work_hour_id: true },
            });
            return result._max.work_hour_id;
        });
        return db_1.prisma.work_hours.create({
            data: {
                work_hour_id: workHourId,
                ...data,
            },
            include: { morning_employees: true, afternoon_employees: true },
        });
    }
    static findAll() {
        return db_1.prisma.work_hours.findMany({
            include: { morning_employees: true, afternoon_employees: true },
            orderBy: { work_hour_id: "asc" },
        });
    }
    static findById(workHourId) {
        return db_1.prisma.work_hours.findUnique({
            where: { work_hour_id: workHourId },
            include: { morning_employees: true, afternoon_employees: true },
        });
    }
    static findByTimeRange(timeIn, timeOut) {
        return db_1.prisma.work_hours.findFirst({
            where: {
                time_in: timeIn,
                time_out: timeOut,
            },
            include: { morning_employees: true, afternoon_employees: true },
        });
    }
    static findByTimeRangeExcludingId(timeIn, timeOut, workHourId) {
        return db_1.prisma.work_hours.findFirst({
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
    static updateById(workHourId, data) {
        return db_1.prisma.work_hours.update({
            where: { work_hour_id: workHourId },
            data,
            include: { morning_employees: true, afternoon_employees: true },
        });
    }
    static deleteById(workHourId) {
        return db_1.prisma.work_hours.delete({
            where: { work_hour_id: workHourId },
        });
    }
}
exports.WorkHourModel = WorkHourModel;
