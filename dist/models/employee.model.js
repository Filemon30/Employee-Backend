"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class EmployeeModel {
    static async create(data) {
        const employeeId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.employees.aggregate({
                _max: { employee_id: true },
            });
            return result._max.employee_id;
        });
        const baseData = {
            employee_id: employeeId,
            position_id: data.position_id,
            card_id: data.card_id ?? null,
            acc_id: data.acc_id,
            info_id: data.info_id,
            work_hour_id: data.work_hour_id,
        };
        return db_1.prisma.employees.create({
            data: baseData,
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
        return db_1.prisma.employees.findMany({
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
    static findById(employeeId) {
        return db_1.prisma.employees.findUnique({
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
    static updateById(employeeId, data) {
        return db_1.prisma.employees.update({
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
    static deleteById(employeeId) {
        return db_1.prisma.employees.delete({
            where: { employee_id: employeeId },
        });
    }
}
exports.EmployeeModel = EmployeeModel;
