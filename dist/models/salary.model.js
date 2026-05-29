"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryModel = void 0;
const db_1 = require("../config/db");
const next_id_1 = require("../utils/next-id");
const http_1 = require("../utils/http");
/**
 * Normalize salary input so all formats become consistent:
 * "10,000" -> "10000"
 * " 001000 " -> "1000"
 */
function normalizeSalary(amount) {
    return String(amount)
        .trim()
        .replace(/,/g, "")
        .replace(/^0+(?=\d)/, "");
}
class SalaryModel {
    /**
     * CREATE OR GET (no duplicates ever)
     */
    static async createOrGet(data, client = db_1.prisma) {
        const normalizedAmount = normalizeSalary(data.amount);
        const existing = await client.salaries.findFirst({
            where: { amount: normalizedAmount },
            include: { positions: true },
        });
        if (existing) {
            return existing;
        }
        const salaryId = await (0, next_id_1.nextIdFromMax)(async () => {
            const result = await client.salaries.aggregate({
                _max: { salary_id: true },
            });
            return result._max.salary_id;
        });
        try {
            return await client.salaries.create({
                data: {
                    salary_id: salaryId,
                    amount: normalizedAmount,
                },
                include: { positions: true },
            });
        }
        catch (err) {
            const maybePrisma = err;
            if (maybePrisma?.code === "P2002") {
                // Unique constraint failed (race) -> return existing salary record
                const existingAfterRace = await client.salaries.findFirst({
                    where: { amount: normalizedAmount },
                    include: { positions: true },
                });
                if (existingAfterRace) {
                    return existingAfterRace;
                }
                throw new http_1.AppError("Salary amount already exists.", 409);
            }
            throw err;
        }
    }
    /**
     * GET ALL
     */
    static findAll() {
        return db_1.prisma.salaries.findMany({
            include: { positions: true },
            orderBy: { salary_id: "asc" },
        });
    }
    /**
     * GET BY ID (with optional transaction client)
     */
    static findById(salaryId, client = db_1.prisma) {
        return client.salaries.findUnique({
            where: { salary_id: salaryId },
            include: { positions: true },
        });
    }
    /**
     * GET BY AMOUNT (normalized)
     */
    static findByAmount(amount) {
        const normalizedAmount = normalizeSalary(amount);
        return db_1.prisma.salaries.findFirst({
            where: { amount: normalizedAmount },
            include: { positions: true },
        });
    }
    /**
     * UPDATE (prevents duplicates properly)
     */
    static async updateById(salaryId, data) {
        let normalizedAmount;
        if (data.amount) {
            normalizedAmount = normalizeSalary(data.amount);
            const existing = await db_1.prisma.salaries.findFirst({
                where: {
                    amount: normalizedAmount,
                    NOT: { salary_id: salaryId },
                },
            });
            if (existing) {
                throw new Error("Salary amount already exists.");
            }
        }
        try {
            return await db_1.prisma.salaries.update({
                where: { salary_id: salaryId },
                data: {
                    ...data,
                    amount: normalizedAmount ?? data.amount,
                },
                include: { positions: true },
            });
        }
        catch (err) {
            const maybePrisma = err;
            if (maybePrisma?.code === "P2002") {
                throw new http_1.AppError("Salary amount already exists.", 409);
            }
            throw err;
        }
    }
    /**
     * DELETE (blocked if used)
     */
    static async deleteById(salaryId) {
        const used = await db_1.prisma.positions.findFirst({
            where: { salary_id: salaryId },
        });
        if (used) {
            throw new Error("Cannot delete salary. It is currently used by one or more positions.");
        }
        return db_1.prisma.salaries.delete({
            where: { salary_id: salaryId },
        });
    }
}
exports.SalaryModel = SalaryModel;
