"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
class PositionModel {
    static async create(data) {
        const positionId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.positions.aggregate({
                _max: { position_id: true },
            });
            return result._max.position_id;
        });
        return db_1.prisma.positions.create({
            data: {
                position_id: positionId,
                ...data,
            },
            include: { departments: true, salaries: true, employees: true },
        });
    }
    static findAll() {
        return db_1.prisma.positions.findMany({
            include: { departments: true, salaries: true, employees: true },
            orderBy: { position_id: "asc" },
        });
    }
    static findById(positionId) {
        return db_1.prisma.positions.findUnique({
            where: { position_id: positionId },
            include: { departments: true, salaries: true, employees: true },
        });
    }
    static findByNameAndDepartment(position_name, department_id) {
        return db_1.prisma.positions.findFirst({
            where: {
                position_name,
                department_id,
            },
        });
    }
    static updateById(positionId, data) {
        return db_1.prisma.positions.update({
            where: { position_id: positionId },
            data,
            include: { departments: true, salaries: true, employees: true },
        });
    }
    static deleteById(positionId) {
        return db_1.prisma.positions.delete({
            where: { position_id: positionId },
        });
    }
}
exports.PositionModel = PositionModel;
