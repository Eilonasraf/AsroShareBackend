import { Request, Response } from "express";
import userModel, { IUser } from "../models/User";
import baseController from "./baseController";
import axios from "axios";
import FormData from "form-data";
import bcrypt from "bcrypt";

class UserController extends baseController<IUser> {
  constructor() {
    super(userModel);
  }

  async getUserByUsername(req: Request, res: Response): Promise<void> {
    console.log("Getting user by username:", req.params.userName);
    super.getAll(req, res, "userName");
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    console.log("Updating user:", req.params.userName);
    console.log("Updating file:", req.file);
    const { password } = req.body;
    let hashedPassword: string | undefined;
    let profilePictureUrl: string | undefined;

    try {
      // If a new password is provided, hash it
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      // If a new file is uploaded, handle it like in the registration process.
      if (req.file) {
        console.log("File uploaded for update.");
        // Create a FormData instance and append the file buffer.
        const fileFormData = new FormData();
        fileFormData.append("file", req.file.buffer, req.file.originalname);
        const oldPath = req.body.oldProfilePictureUrl;

        console.log("Old path:", oldPath);

        try {
          const fileResponse = await axios.put(
            "http://localhost:3000/api/file/" + oldPath,
            fileFormData,
            {
              headers: {
                ...fileFormData.getHeaders(),
                Authorization: req.headers.authorization,
              },
            }
          );
          console.log("File upload response:", fileResponse.data);
          profilePictureUrl = fileResponse.data.url;
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }

      // Build the partial update object for the user.
      const updatedUser: Partial<IUser> = {};
      if (hashedPassword) {
        updatedUser.password = hashedPassword;
      }
      if (profilePictureUrl) {
        console.log("Updating profile picture URL:", profilePictureUrl);
        updatedUser.profilePictureUrl = profilePictureUrl;
      }

      // Overwrite req.body with the update object.
      req.body = updatedUser;

      // Call the parent's update method to perform the actual update.
      super.update(req, res);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send({ error: "Failed to update user" });
    }
  }
}

export default new UserController();
