import express from "express";
import rateLimit from "express-rate-limit";
import { verifyToken, requireVerified } from "../middleware/verifyToken.js";
import * as controller from "../controllers/lobby.controller.js";
const router = express.Router();
router.get("/", controller.getLobbies);
router.get("/options", controller.metadata);
router.post(
  "/",
  verifyToken,
  requireVerified,
  rateLimit({
    windowMs: 60_000,
    limit: 5,
    keyGenerator: (req) => req.user.id,
    legacyHeaders: false,
    standardHeaders: "draft-7",
  }),
  controller.createLobby,
);
router.get("/:id", controller.getLobby);
router.get("/:id/ice", verifyToken, requireVerified, controller.iceServers);
router.patch("/:id/close", verifyToken, requireVerified, controller.closeLobby);
export default router;
