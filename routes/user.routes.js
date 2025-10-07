import express from "express";
import { askToAssistant, getCurrentUser, updateAvatar } from "../controllers/user.controller.js";
import isAuth from "../middlewares/isAuth.js";
import multer from "multer";



const userRouter = express.Router();

// setup multer for temporary storage before Cloudinary upload
const upload = multer({ dest: "uploads/" });

// get current user
userRouter.get("/current", isAuth, getCurrentUser);

// update avatar (accepts either file or imageUrl)
userRouter.post("/update", isAuth, upload.single("avatarImage"), updateAvatar);
userRouter.post("/asktoassistant",isAuth,askToAssistant)
export default userRouter;
