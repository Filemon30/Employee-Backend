"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentModel = void 0;
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
const next_id_1 = require("../utils/next-id");
class DepartmentModel {
    // CREATE
    static async create(data) {
        const name = data.department_name.trim();
        const departmentId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await db_1.prisma.departments.aggregate({
                _max: { department_id: true },
            });
            return result._max.department_id;
        });
        // IMPORTANT FIX: use findFirst instead of findUnique
        const existing = await db_1.prisma.departments.findFirst({
            where: {
                department_name: name,
            },
        });
        if (existing) {
            throw new http_1.AppError("Department already exists.", 409);
        }
        return db_1.prisma.departments.create({
            data: {
                department_id: departmentId,
                department_name: name,
                department_head: data.department_head ?? null,
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
        return db_1.prisma.departments.findMany({
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
    static findById(departmentId) {
        return db_1.prisma.departments.findUnique({
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
    static async updateById(departmentId, data) {
        const id = departmentId;
        const updateData = {};
        if (data.department_name) {
            const name = data.department_name.trim();
            const existing = await db_1.prisma.departments.findFirst({
                where: {
                    department_name: name,
                    NOT: { department_id: id },
                },
            });
            if (existing) {
                throw new http_1.AppError("Department already exists.", 409);
            }
            updateData.department_name = name;
        }
        if (Object.prototype.hasOwnProperty.call(data, "department_head")) {
            updateData.department_head = data.department_head ?? null;
        }
        return db_1.prisma.departments.update({
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
    static deleteById(departmentId) {
        return db_1.prisma.departments.delete({
            where: {
                department_id: departmentId,
            },
        });
    }
}
exports.DepartmentModel = DepartmentModel;
