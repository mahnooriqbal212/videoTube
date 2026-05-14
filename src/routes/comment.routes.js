import { Router } from "express";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { commentValidator } from "../validators/comment.validators.js";

const router = Router();

// All comment routes require authentication
router.use(verifyJWT);

router
  .route("/:videoId")
  .get(getVideoComments)
  .post(commentValidator, addComment);

router
  .route("/c/:commentId")
  .patch(commentValidator, updateComment)
  .delete(deleteComment);

export default router;
