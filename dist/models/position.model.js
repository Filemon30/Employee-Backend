"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
const http_1 = require("../utils/http");
class PositionModel {
    // CREATE
    static async create(data, client = db_1.prisma) {
        // 🔒 Enforce uniqueness inside model (not controller)
        const existing = await client.positions.findFirst({
            where: {
                department_id: data.department_id,
                position_name: data.position_name,
            },
        });
        if (existing) {
            throw new http_1.AppError(`Position "${data.position_name}" already exists in this department.`, 409);
        }
        const positionId = await (0, next_id_1.nextIdFromMax)(async () => {
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
        }
        catch (err) {
            const maybePrisma = err;
            if (maybePrisma?.code === "P2002") {
                throw new http_1.AppError(`Position "${data.position_name}" already exists in this department.`, 409);
            }
            throw err;
        }
    }
    // READ ALL
    static findAll() {
        return db_1.prisma.positions.findMany({
            include: { departments: true, salaries: true, employees: true },
            orderBy: { position_id: "asc" },
        });
    }
    // READ ONE
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
    // UPDATE
    static async updateById(positionId, data) {
        // 🔒 If changing name or department, enforce uniqueness
        if (data.position_name || data.department_id) {
            const current = await db_1.prisma.positions.findUnique({
                where: { position_id: positionId },
            });
            if (!current)
                throw new http_1.AppError("Position not found.", 404);
            const nameToCheck = data.position_name ?? current.position_name;
            const deptToCheck = data.department_id ?? current.department_id;
            const duplicate = await db_1.prisma.positions.findFirst({
                where: {
                    position_name: nameToCheck,
                    department_id: deptToCheck,
                    NOT: { position_id: positionId },
                },
            });
            if (duplicate) {
                throw new http_1.AppError(`Position "${nameToCheck}" already exists in this department.`, 409);
            }
        }
        try {
            return await db_1.prisma.positions.update({
                where: { position_id: positionId },
                data,
                include: { departments: true, salaries: true, employees: true },
            });
        }
        catch (err) {
            const maybePrisma = err;
            if (maybePrisma?.code === "P2002") {
                throw new http_1.AppError(`Position "${data.position_name ?? ""}" already exists in this department.`, 409);
            }
            throw err;
        }
    }
    // DELETE
    static async deleteById(positionId, client = db_1.prisma) {
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
exports.PositionModel = PositionModel;
