import { Router } from "express";
import { 
    createPosition,
    getAllPositions,
    getPositionById,
    updatePosition,
    deletePosition
} from "../controller/position.controller";

const positionRouter = Router();

positionRouter.post("/", createPosition);
positionRouter.get("/", getAllPositions);
positionRouter.get("/:id", getPositionById);
positionRouter.put("/:id", updatePosition);
positionRouter.delete("/:id", deletePosition);

export { positionRouter };