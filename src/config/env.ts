import dotenv from "dotenv";

dotenv.config();

/** Local testing when DATABASE_URL is not set (Postgres on 127.0.0.1:5432). */
const LOCAL_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/PRSM?schema=public";

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 5000);
  return Number.isNaN(port) ? 5000 : port;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDevelopment: (process.env.NODE_ENV ?? "development") !== "production",
  port: parsePort(process.env.PORT),
  databaseUrl:
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV !== "production" ? LOCAL_TEST_DATABASE_URL : ""),
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required in environment variables.");
}
