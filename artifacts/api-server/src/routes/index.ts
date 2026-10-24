import { Router, type IRouter } from "express";
import healthRouter from "./health";
import verifaiRouter from "./verifai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(verifaiRouter);

export default router;
