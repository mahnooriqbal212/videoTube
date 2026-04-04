import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getAllVideos,
  getVideoById,
  publishAVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controllers.js";

const router = Router();

// unsecured routes
router.route("/").get(getAllVideos);
router.route("/:videoId").get(getVideoById);

// secured routes
router.use(verifyJWT);

router.route("/publish").post(
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);

router.route("/:videoId").put(
  upload.single("thumbnail"), // Only thumbnail file optional
  updateVideo
);
router.route("/:videoId").delete(deleteVideo);
router.route("/:videoId/toggle-publish").patch(togglePublishStatus);

export default router;