import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/videos.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── Helpers ───────────────────────────────────────

const toggleLike = async (entityId, entityType, entityDoc, userId) => {
  if (!entityDoc) throw new ApiError(404, `${entityType} not found`);

  const filter = {
    [entityType]: entityId,
    likedBy: userId,
  };

  // If a like existed it gets deleted and returned; if not, returns null
  const deletedLike = await Like.findOneAndDelete(filter);

  if (deletedLike) {
    return { liked: false };
  }

  await Like.create(filter);
  return { liked: true };
};

// ─── Controllers ─────────────────────────────────────────

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  const result = await toggleLike(videoId, "video", video, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Video liked" : "Video unliked"
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  const result = await toggleLike(commentId, "comment", comment, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Comment liked" : "Comment unliked"
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);
  const result = await toggleLike(tweetId, "tweet", tweet, req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Tweet liked" : "Tweet unliked"
      )
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  /*
    Get all videos that the current user has liked, but only if:
      * The video still exists
      * The video is published (not deleted/unlisted)
      * Include video details and owner information  
  */
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $match: { isPublished: true },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: { username: 1, fullname: 1, avatar: 1 },
                },
              ],
            },
          },
          { $unwind: "$owner" },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              owner: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      // Drops likes where the video was deleted or unpublished - an empty video array
      $unwind: "$video",
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 0,
        video: 1,
        likedAt: "$createdAt",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
