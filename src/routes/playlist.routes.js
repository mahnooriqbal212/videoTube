import { Router } from "express";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createPlaylistValidator,
  updatePlaylistValidator,
} from "../validators/playlist.validators.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylistValidator, createPlaylist);

router.route("/u/:userId").get(getUserPlaylists);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(updatePlaylistValidator, updatePlaylist)
  .delete(deletePlaylist);

router
  .route("/:playlistId/videos/:videoId")
  .post(addVideoToPlaylist)
  .delete(removeVideoFromPlaylist);

export default router;
