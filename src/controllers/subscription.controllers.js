import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Prevent self-subscription
  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const channel = await User.findById(channelId);
  if (!channel) throw new ApiError(404, "Channel not found");

  const filter = {
    subscriber: req.user._id,
    channel: channelId,
  };

  const existingSubscription = await Subscription.findOne(filter);

  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully")
      );
  }

  await Subscription.create(filter);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { subscribed: true }, "Subscribed successfully")
    );
});

// Return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // In this app, channels are users — a user's profile IS their channel
  const channel = await User.findById(channelId);
  if (!channel) throw new ApiError(404, "Channel not found");

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: new mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
    {
      $unwind: "$subscriber",
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        subscriber: 1,
        createdAt: 1, // when they subscribed
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribers, subscriberCount: subscribers.length },
        "Subscribers fetched successfully"
      )
    );
});

// Return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;  // user id

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscriber = await User.findById(subscriberId);
  if (!subscriber) throw new ApiError(404, "User not found");

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            // Count how many subscribers each channel has
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "channelSubscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: { $size: "$channelSubscribers" },
              // Is the current user subscribed? (always true here, but useful for UI consistency)
              isSubscribed: true,
            },
          },
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$channel",
    },
    {
      $sort: { createdAt: -1 }, // most recently subscribed first
    },
    {
      $project: {
        channel: 1,
        createdAt: 1, // when they subscribed
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribedChannels,
        subscribedCount: subscribedChannels.length,
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
