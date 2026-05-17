import mongoose from "mongoose";
import { Video } from "../models/videos.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = new mongoose.Types.ObjectId(req.user._id);

  // using Promise.all() for parallel queries — both DB queries execute simultaneously 
  // cuts the response time roughly in half
  const [videoStats, subscriberCount] = await Promise.all([
    // ── Video stats: views, likes, total videos ──────────────────────────────
    Video.aggregate([
      {
        $match: { owner: channelId },
      },
      {
        // Join likes for each video
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: { $size: "$likes" } },
          publishedVideos: {
            $sum: { $cond: ["$isPublished", 1, 0] },
          },
          unpublishedVideos: {
            $sum: { $cond: ["$isPublished", 0, 1] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalVideos: 1,
          totalViews: 1,
          totalLikes: 1,
          publishedVideos: 1,
          unpublishedVideos: 1,
        },
      },
    ]),

    // ── Subscriber count ─────────────────────────────────────────────────────
    Subscription.countDocuments({ channel: channelId }),
  ]);

  // videoStats is an array — if channel has no videos it will be empty
  const stats = videoStats[0] ?? {
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    publishedVideos: 0,
    unpublishedVideos: 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...stats,
        totalSubscribers: subscriberCount,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = new mongoose.Types.ObjectId(req.user._id);

  const videos = await Video.aggregate([
    {
      $match: { owner: channelId },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $sort: { createdAt: -1 }, // most recently uploaded first
    },
    {
      $project: {
        title: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        likesCount: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
