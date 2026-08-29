import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentaDownloadRouter from "./documentaDownload";
import imapRouter from "./imap";
import documentaIntelligenceRouter from "./documentaIntelligence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentaDownloadRouter);
router.use(imapRouter);
router.use(documentaIntelligenceRouter);

export default router;
