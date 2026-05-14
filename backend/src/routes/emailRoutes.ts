import { Router } from "express";
import {
  getMessage,
  handleEmailAuth,
  handleRedirect,
} from "../controllers/emailController";

const router = Router();

router.get("/email/:emailId", handleEmailAuth);
router.get("/redirect", handleRedirect);
router.post("/getMessage", getMessage);

export default router;
