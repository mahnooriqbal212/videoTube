import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * Reads express-validator results and throws a 400 ApiError
 * listing every validation failure if any exist.
 * Drop this at the END of every validator middleware array.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = errors
    .array()
    .map((err) => ({ [err.path]: err.msg }));
  throw new ApiError(422, "Recieved data is not valid", extractedErrors);
};
