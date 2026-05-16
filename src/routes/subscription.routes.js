import { Router } from "express";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

// Toggle subscription to a channel
router.post("/c/:channelId", toggleSubscription);

// Get all subscribers of a channel
router.get("/c/:channelId/subscribers", getUserChannelSubscribers);

// Get all channels a user has subscribed to
router.get("/u/:subscriberId", getSubscribedChannels);

export default router;
