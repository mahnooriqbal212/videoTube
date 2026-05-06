import { Router } from "express";
import {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router.post("/video/:videoId", toggleVideoLike);
router.post("/comment/:commentId", toggleCommentLike);
router.post("/tweet/:tweetId", toggleTweetLike);
router.get("/videos", getLikedVideos);

export default router;
