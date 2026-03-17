import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

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
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  
  // validation
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) throw new ApiError(400, "Video file is required");
  if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");

  const videoUpload = await uploadOnCloudinary(videoLocalPath);
  if (!videoUpload?.url)
    throw new ApiError(500, "Something went wrong while uploading video");

  const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailUpload?.url) {
    if (videoUpload?.public_id) {
      await deleteFromCloudinary(videoUpload.public_id);
    }
    throw new ApiError(500, "Something went wrong while uploading thumbnail");
  }

  const duration = Number(videoUpload?.duration);
  if (!Number.isFinite(duration)) {
    if (videoUpload?.public_id) {
      await deleteFromCloudinary(videoUpload.public_id);
    }
    if (thumbnailUpload?.public_id) {
      await deleteFromCloudinary(thumbnailUpload.public_id);
    }
    throw new ApiError(500, "Unable to read video duration");
  }

  try {
    const video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      videoFile: videoUpload.url,
      thumbnail: thumbnailUpload.url,
      duration,
      owner: req.user._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, video, "Video published successfully"));
  } catch (error) {
    if (videoUpload?.public_id) {
      await deleteFromCloudinary(videoUpload.public_id);
    }
    if (thumbnailUpload?.public_id) {
      await deleteFromCloudinary(thumbnailUpload.public_id);
    }
    throw new ApiError(500, "Failed to publish video");
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
