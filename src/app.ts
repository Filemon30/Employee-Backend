import cors from "cors";
import express from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import { AppError } from "./utils/http";
import { apiRouter } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.use((_req, _res, next) => {
  next(new AppError("Route not found.", 404));
});

app.use(errorMiddleware);

export { app };
