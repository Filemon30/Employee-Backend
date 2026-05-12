"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const parsePort = (value) => {
    const port = Number(value ?? 5000);
    return Number.isNaN(port) ? 5000 : port;
};
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: parsePort(process.env.PORT),
    databaseUrl: process.env.DATABASE_URL ?? "",
};
if (!exports.env.databaseUrl) {
    throw new Error("DATABASE_URL is required in environment variables.");
}
