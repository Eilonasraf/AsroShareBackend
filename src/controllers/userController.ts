import { Request, Response } from "express";
import userModel, { IUser } from "../models/User";
import baseController from "./baseController";
import { console } from "inspector";
import { replaceFile, uploadFile } from "./fileController";

class UserController extends baseController<IUser> {
  constructor() {
    super(userModel);
  }

  async getUserByUsername(req: Request, res: Response): Promise<void> {
    console.log("Getting user by username:", req.params.userName);
    super.getAll(req, res, "userName");
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    console.log("Getting user by id:", req.params.id);
    super.getById(req, res);
  }

  async updateGoogleUser(req: Request, res: Response): Promise<void> {
    console.log("Updating Google user:", req.params.userName);
    console.log("Uploaded file:", req.file);

    let profilePictureUrl: string | undefined;

    try {
      // Handle profile picture upload, ignore old Google URL
      if (req.file) {
        console.log("Google user uploaded a new picture.");

        // Upload without trying to delete anything
        try {
          const fileResponse = await uploadFile(req.file);
          if (!fileResponse.success) {
            console.error("Error uploading Google user's picture.");
            res.status(500).send({ error: "Failed to upload profile picture" });
            return;
          }
          profilePictureUrl = fileResponse.fileName;
        } catch (error) {
          console.error("Error uploading Google user's picture:", error);
          res.status(500).send({ error: "Failed to upload profile picture" });
          return;
        }
      }

      // Prepare the update payload
      const updatedUser: Partial<IUser> = {};

      if (req.body.userName) {
        updatedUser.userName = req.body.userName;
      }

      if (profilePictureUrl) {
        updatedUser.profilePictureUrl = profilePictureUrl;
      }

      if (req.body.bio) {
        updatedUser.bio = req.body.bio;
      }

      // Find Google user and update
      const userToUpdate = await userModel.findOne({
        userName: req.params.userName,
      });

      if (!userToUpdate) {
        res.status(404).send({ error: "User not found" });
        return;
      }

      // Only allow update if user is Google user
      if (!userToUpdate.googleId) {
        res.status(400).send({ error: "Not a Google user" });
        return;
      }

      // Apply changes and save
      userToUpdate.set(updatedUser);
      await userToUpdate.save();

      console.log("Google user successfully updated:", userToUpdate);

      res.json(userToUpdate);
    } catch (error) {
      console.error("Error updating Google user:", error);
      res.status(500).send({ error: "Failed to update Google user" });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    console.log("Updating user:", req.params.userName);
    console.log("Updating file:", req.file);

    let profilePictureUrl: string | undefined;

    if (req.file && (await uploadFile(req.file))) {
      console.log("File uploaded successfully");
    } else {
      console.log("Error uploading file");
    }

    try {
      // If a new file is uploaded, handle it like in the registration process.
      if (req.file) {
        console.log("File uploaded for update.");

        const oldPath = req.body.oldProfilePictureUrl;

        console.log("Old path:", oldPath);
        if (oldPath === "default_profile.png") {
          console.log("Default profile picture, no need to delete.");

          try {
            const fileResponse = await uploadFile(req.file);

            profilePictureUrl = fileResponse.fileName;
          } catch (error) {
            console.error("Error uploading file:", error);
          }
        } else {
          try {
            const fileResponse = await replaceFile(req.file, oldPath);

            profilePictureUrl = fileResponse.fileName;
          } catch (error) {
            console.error("Error uploading file:", error);
          }
        }
      } else {
        console.log("No file uploaded for update.");
      }

      // Build the partial update object for the user.
      const updatedUser: Partial<IUser> = {};
      if (req.body.userName) {
        updatedUser.userName = req.body.userName;
        console.log("Updating username:", req.body.userName);
      }

      if (profilePictureUrl) {
        console.log("Updating profile picture URL:", profilePictureUrl);
        updatedUser.profilePictureUrl = profilePictureUrl;
      }

      if (req.body.bio) {
        updatedUser.bio = req.body.bio;
      }

      // Overwrite req.body with the update object.
      req.body = updatedUser;

      // Call the parent's update method to perform the actual update.
      try {
        console.log("Body:", req.body);
        await super.update(req, res);
        const userAfterUpdate = await userModel.findOne({
          userName: req.body.userName,
        });
        res.json(userAfterUpdate);
      } catch (error) {
        const typedError = error as {
          code: number;
          keyPattern?: { userName?: unknown };
        };
        if (
          typedError.code === 11000 &&
          typedError.keyPattern &&
          typedError.keyPattern.userName
        ) {
          res.status(400).send({
            error: "Username already exists, Please choose another one",
          });
          return;
        }
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send({ error: "Failed to update user" });
    }
  }
}

export default new UserController();
