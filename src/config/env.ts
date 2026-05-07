import dotenv from "dotenv";

dotenv.config();

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 5000);
  return Number.isNaN(port) ? 5000 : port;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL ?? "",
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required in environment variables.");
}
