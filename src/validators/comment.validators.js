import { body } from "express-validator";
import { validate } from "../middlewares/validator.middleware.js";

// Used for both addComment and updateComment — same rules apply
const commentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),

  validate,
];

export { commentValidator };
