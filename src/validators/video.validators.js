import { body, query } from "express-validator";
import { validate } from "../middlewares/validator.middleware.js";

// ─── Publish video ────────────────────────────────────────────────────────────

const publishVideoValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be 100 characters or fewer"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 5000 })
    .withMessage("Description must be 5000 characters or fewer"),

  validate,
];

// ─── Update video ─────────────────────────────────────────────────────────────

const updateVideoValidator = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Title must be 100 characters or fewer"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ max: 5000 })
    .withMessage("Description must be 5000 characters or fewer"),

  // At least one field must be provided for an update
  body().custom((_, { req }) => {
    const { title, description } = req.body;
    const hasThumbnail = !!req.files?.thumbnail?.[0];

    if (!title && !description && !hasThumbnail) {
      throw new Error(
        "At least one of title, description, or thumbnail must be provided"
      );
    }
    return true;
  }),

  validate,
];

// ─── Get all videos (query params) ───────────────────────────────────────────

const getAllVideosValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "views", "title"])
    .withMessage("sortBy must be one of: createdAt, updatedAt, views, title"),

  query("sortType")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortType must be either asc or desc"),

  validate,
];

export { publishVideoValidator, updateVideoValidator, getAllVideosValidator };
