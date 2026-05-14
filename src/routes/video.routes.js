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
import {
  publishVideoValidator,
  updateVideoValidator,
  getAllVideosValidator,
} from "../validators/video.validators.js";

const router = Router();

router.use(verifyJWT); // all video routes require auth

router
  .route("/")
  .get(getAllVideosValidator, getAllVideos)
  .post(
    upload.fields([
      { name: "videoFile", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    publishVideoValidator,
    publishAVideo
  );

router
  .route("/:videoId")
  .get(getVideoById)
  .patch(
    upload.fields([{ name: "thumbnail", maxCount: 1 }]),
    updateVideoValidator,
    updateVideo
  )
  .delete(deleteVideo);

router.route("/:videoId/toggle-publish").patch(togglePublishStatus);

export default router;
