"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class SalaryModel {
    static async create(data) {
        const salaryId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.salaries.aggregate({
                _max: { salary_id: true },
            });
            return result._max.salary_id;
        });
        return db_1.prisma.salaries.create({
            data: {
                salary_id: salaryId,
                ...data,
            },
            include: { positions: true },
        });
    }
    static findAll() {
        return db_1.prisma.salaries.findMany({
            include: { positions: true },
            orderBy: { salary_id: "asc" },
        });
    }
    static findById(salaryId) {
        return db_1.prisma.salaries.findUnique({
            where: { salary_id: salaryId },
            include: { positions: true },
        });
    }
    static updateById(salaryId, data) {
        return db_1.prisma.salaries.update({
            where: { salary_id: salaryId },
            data,
            include: { positions: true },
        });
    }
    static deleteById(salaryId) {
        return db_1.prisma.salaries.delete({
            where: { salary_id: salaryId },
        });
    }
}
exports.SalaryModel = SalaryModel;
