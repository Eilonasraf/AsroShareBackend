import express from "express";
const router = express.Router();
import userController from "../controllers/userController";
import multer from "multer";

const upload = multer();

router.get("/:userName", userController.getUserByUsername.bind(userController));
router.put(
  "/:userName",
  upload.single("profilePicture"),
  userController.updateUser.bind(userController)
);
export default router;
