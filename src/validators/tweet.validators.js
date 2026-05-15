import { body } from "express-validator";
import { validate } from "../middlewares/validator.middleware.js";

// Used for both createTweet and updateTweet — same rules apply
const tweetValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Tweet content is required")
    .isLength({ max: 280 })
    .withMessage("Tweet cannot exceed 280 characters"),

  validate,
];

export { tweetValidator };
