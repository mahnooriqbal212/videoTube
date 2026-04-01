import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import fs from "fs/promises";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  //TODO: get all videos based on query, sort, pagination
  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit)));

  if (
    Number.isNaN(parsedPage) ||
    Number.isNaN(parsedLimit) ||
    parsedPage < 1 ||
    parsedLimit < 1
  ) {
    throw new ApiError(400, "Invalid page or limit");
  }

  const filter = { isPublished: true };

  if (query?.trim()) {
    filter.$or = [
      { title: { $regex: query.trim(), $options: "i" } },
      { description: { $regex: query.trim(), $options: "i" } },
    ];
  }

  if (userId) {
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");
    filter.owner = new mongoose.Types.ObjectId(userId);
  }

  const allowedSortFields = ["createdAt", "updatedAt", "views", "title"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const safeSortType = sortType === "asc" ? 1 : -1;

  const aggregateVideos = Video.aggregate([
    { $match: filter },
    { $sort: { [safeSortBy]: safeSortType } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullname: 1, username: 1, avatar: 1 } }],
      },
    },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
  ]);

  const options = {
    page: parsedPage,
    limit: parsedLimit,
  };

  const videos = await Video.aggregatePaginate(aggregateVideos, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video

  const { title, description } = req.body;
  const videoFile = req.files?.videoFile?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  // Constants
  const MAX_TITLE_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 5000;
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  // Authorization check
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  // Title validation
  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    throw new ApiError(
      400,
      `Title must be less than ${MAX_TITLE_LENGTH} characters`
    );
  }

  // Description validation
  if (!description?.trim()) {
    throw new ApiError(400, "Description is required");
  }
  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    throw new ApiError(
      400,
      `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`
    );
  }

  // File existence check
  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailFile) {
    throw new ApiError(400, "Thumbnail is required");
  }

  // File type validation
  if (!ALLOWED_VIDEO_TYPES.includes(videoFile.mimetype)) {
    throw new ApiError(
      400,
      "Invalid video format. Only MP4, WebM, and OGG are allowed"
    );
  }
  if (!ALLOWED_IMAGE_TYPES.includes(thumbnailFile.mimetype)) {
    throw new ApiError(
      400,
      "Invalid thumbnail format. Only JPEG, PNG, and WebP are allowed"
    );
  }

  // File size validation
  if (videoFile.size > MAX_VIDEO_SIZE) {
    throw new ApiError(400, "Video file too large. Maximum size is 100MB");
  }
  if (thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
    throw new ApiError(400, "Thumbnail too large. Maximum size is 5MB");
  }

  const uploadedAssets = [];

  try {
    // Parallel uploads for better performance
    const [videoUpload, thumbnailUpload] = await Promise.all([
      uploadOnCloudinary(videoFile.path),
      uploadOnCloudinary(thumbnailFile.path),
    ]);

    // Validate video upload
    if (!videoUpload?.url) {
      throw new ApiError(500, "Video upload failed. Please try again");
    }
    uploadedAssets.push(videoUpload);

    // Validate thumbnail upload
    if (!thumbnailUpload?.url) {
      throw new ApiError(500, "Thumbnail upload failed. Please try again");
    }
    uploadedAssets.push(thumbnailUpload);

    // Validate video duration
    const duration = Number(videoUpload?.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ApiError(
        500,
        "Unable to read video duration. Please upload a valid video file"
      );
    }

    // Create video document
    const video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      videoFile: videoUpload.url,
      thumbnail: thumbnailUpload.url,
      duration,
      owner: req.user._id,
      isPublished: true,
      views: 0,
    });

    // Fetch created video with owner details
    const createdVideo = await Video.findById(video._id)
      .select("-__v")
      .populate("owner", "username fullname avatar");

    return res
      .status(201)
      .json(new ApiResponse(201, createdVideo, "Video published successfully"));
  } catch (error) {
    // Cleanup Cloudinary assets on failure
    const validAssets = uploadedAssets.filter((asset) => asset?.public_id);
    if (validAssets.length > 0) {
      await Promise.allSettled(
        validAssets.map((asset) => deleteFromCloudinary(asset.public_id))
      );
    }
    throw error;
  } 
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
