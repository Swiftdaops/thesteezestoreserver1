// src/config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

// Prefer single URL config if available; otherwise fall back to individual vars
if (process.env.CLOUDINARY_URL) {
  try {
    // Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
    const u = new URL(process.env.CLOUDINARY_URL);
    const cloud_name = u.hostname;
    const api_key = u.username;
    const api_secret = u.password;
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  } catch (e) {
    // Fallback to env pieces if parsing fails
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dnitzkowt",
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dnitzkowt",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export default cloudinary;
