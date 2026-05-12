"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const startServer = async () => {
    await (0, db_1.connectDatabase)();
    app_1.app.listen(env_1.env.port, () => {
        console.log(`Server running on http://localhost:${env_1.env.port}`);
    });
};
startServer().catch(async (error) => {
    console.error("Failed to start server:", error);
    await db_1.prisma.$disconnect();
    process.exit(1);
});
const shutdown = async () => {
    await db_1.prisma.$disconnect();
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
