import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "videoTube",
    }); // automatically detect which file is coming

    // Clean up temp file immediately after successful upload
    fs.promises
      .unlink(localFilePath)
      .catch((err) =>
        console.error(`Failed to delete temp file: ${err.message}`)
      );

    return response;
  } catch (error) {
    console.error("Cloudinary upload failed:", error.message);
    // Clean up temp file on failure
    fs.promises.unlink(localFilePath).catch(() => {});
    throw error;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Deleted from cloudinary. Public id", publicId);
  } catch (error) {
    console.log("Error deleting from cloudinary", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
