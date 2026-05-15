import { Router } from "express";
import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { tweetValidator } from "../validators/tweet.validators.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(tweetValidator, createTweet);
router.route("/u/:userId").get(getUserTweets);
router
  .route("/:tweetId")
  .patch(tweetValidator, updateTweet)
  .delete(deleteTweet);

export default router;
