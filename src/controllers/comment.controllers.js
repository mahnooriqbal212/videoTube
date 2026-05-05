import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── Helpers ────────────────────────────────────────

const validateCommentContent = (content) => {
  if (!content?.trim()) throw new ApiError(400, "Comment content is required");

  const trimmed = content.trim();
  if (trimmed.length > 1000) {
    throw new ApiError(400, "Comment cannot exceed 1000 characters");
  }
  return trimmed;
};

// ─── Controllers ────────────────────────────────────

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate video ID
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  // Parse pagination parameters
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  if (isNaN(parsedPage) || isNaN(parsedLimit)) {
    throw new ApiError(400, "Page and limit must be valid numbers");
  }

  const safePage = Math.max(1, parsedPage);
  const safeLimit = Math.min(50, Math.max(1, parsedLimit));

  // Create aggregation pipeline for comments with owner details
  const aggregateComments = Comment.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    { $sort: { createdAt: -1 } }, // Newest comments first
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // owner is always required — if missing, skip the comment
    { $unwind: "$owner" },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"],
        },
      },
    },
    {
      $project: {
        likes: 0,
        __v: 0,
      },
    },
  ]);

  // Apply pagination
  const options = {
    page: safePage,
    limit: safeLimit,
  };

  const comments = await Comment.aggregatePaginate(aggregateComments, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  // validations
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const trimmedContent = validateCommentContent(content);

  // Create comment
  const comment = await Comment.create({
    content: trimmedContent,
    video: videoId,
    owner: req.user._id,
  });

  // Populate owner details after creation for a clean response shape
  const createdComment = await Comment.findById(comment._id)
    .populate("owner", "username fullname avatar")
    .populate("video", "title thumbnail");

  if (!createdComment) {
    throw new ApiError(500, "Failed to retrieve comment after creation");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // Validate comment ID
  if (!isValidObjectId(commentId))
    throw new ApiError(400, "Invalid comment ID");

  // Single query: find the comment and verify ownership together
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  // Validate content
  const trimmedContent = validateCommentContent(content);

  // Update comment
  comment.content = trimmedContent;
  await comment.save();

  // Populate for consistent response shape
  await comment.populate("owner", "username fullname avatar");
  await comment.populate("video", "title thumbnail");

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Validate comment ID
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // find comment
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorised to delete this comment");
  }

  // Delete comment
  await Comment.findByIdAndDelete(commentId);

  // Clean up likes that reference this comment
  await Like.deleteMany({ comment: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
