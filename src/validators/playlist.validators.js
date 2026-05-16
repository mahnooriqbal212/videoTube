import { body } from "express-validator";
import { validate } from "../middlewares/validator.middleware.js";

// Used for createPlaylist — both fields required
const createPlaylistValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Playlist name is required")
    .isLength({ max: 100 })
    .withMessage("Playlist name must be 100 characters or fewer"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Playlist description is required")
    .isLength({ max: 500 })
    .withMessage("Description must be 500 characters or fewer"),

  validate,
];

// Used for updatePlaylist — both fields optional but at least one required
const updatePlaylistValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Playlist name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Playlist name must be 100 characters or fewer"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Description must be 500 characters or fewer"),

  body().custom((_, { req }) => {
    const { name, description } = req.body;
    if (!name && !description) {
      throw new Error("At least one of name or description must be provided");
    }
    return true;
  }),

  validate,
];

export { createPlaylistValidator, updatePlaylistValidator };
