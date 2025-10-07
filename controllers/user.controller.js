import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import moment from "moment";

// -----------------------------
// GET CURRENT LOGGED-IN USER
// -----------------------------
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: no user ID found" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return res.status(500).json({ message: "Server error while fetching current user" });
  }
};

// -----------------------------
// UPDATE USER AVATAR
// -----------------------------
export const updateAvatar = async (req, res) => {
  try {
    const { avatarName, imageUrl } = req.body;
    let avatarImage;

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      avatarImage = uploadResult?.url;
    } else {
      avatarImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatarImage, avatarName },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("updateAvatar error:", error);
    return res.status(500).json({ message: "Server error while updating avatar" });
  }
};

// -----------------------------
// ASK ASSISTANT
// -----------------------------
export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || command.trim() === "") {
      return res.status(400).json({ response: "Command cannot be empty." });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ response: "User not found." });
    }

    // Save command to history
    user.history.push(command);
    await user.save();

    const userName = user.name;
    const assistantName = user.assistantName;

    // Call Gemini safely
    const gemResult = await geminiResponse(command, assistantName, userName);

    console.log("Gemini raw response:", gemResult);

    // Validate result
    if (!gemResult || !gemResult.type || !gemResult.response) {
      return res.status(500).json({
        type: "general",
        userInput: command,
        response: "Sorry, the assistant couldn't process that.",
      });
    }

    const { type, userInput, response } = gemResult;

    // Handle date/time/day/month commands locally
    switch (type) {
      case "get-date":
        return res.json({
          type,
          userInput,
          response: `Current date is ${moment().format("YYYY-MM-DD")}`,
        });

      case "get-time":
        return res.json({
          type,
          userInput,
          response: `Current time is ${moment().format("hh:mm A")}`,
        });

      case "get-day":
        return res.json({
          type,
          userInput,
          response: `Today is ${moment().format("dddd")}`,
        });

      case "get-month":
        return res.json({
          type,
          userInput,
          response: `Current month is ${moment().format("MMMM")}`,
        });

      // General commands (searches, social, media, etc.)
      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "twitter-open":
      case "linkedin-open":
      case "weather-show":
      case "alarm-set":
      case "reminder-set":
      case "joke-tell":
      case "news-show":
      case "translate-text":
      case "unit-convert":
      case "currency-convert":
      case "open-app":
      case "call-contact":
      case "send-message":
      case "play-music":
      case "stop-music":
      case "pause-music":
      case "resume-music":
      case "note-create":
      case "note-read":
        return res.json({ type, userInput, response });

      default:
        return res.status(400).json({
          type: "general",
          userInput: command,
          response: "I didn't understand that command.",
        });
    }
  } catch (error) {
    console.error("askToAssistant error:", error);
    return res.status(500).json({
      type: "general",
      userInput: req.body.command || "",
      response: "Internal server error while processing your command.",
    });
  }
};
