/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data";
import postModel, { IPost } from "../models/Post";
import baseController from "./baseController";

class PostsController extends baseController<IPost> {
  constructor() {
    super(postModel);
  }

  async createPost(req: Request, res: Response) {
    console.log(
      "Creating post for sender:",
      req.params.userName || req.body.sender
    );
    const body = req.body;
    // Added
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    let pictureUrl: string = body.pictureUrl || "";

    // If a new file is uploaded, process it.
    if (req.file) {
      console.log("File uploaded for creation:", req.file.originalname);
      const fileFormData = new FormData();
      fileFormData.append("file", req.file.buffer, req.file.originalname);

      try {
        // For creation, simply post the file since there's no old file to replace.
        const fileResponse = await axios.post(
          "http://localhost:3000/api/file/",
          fileFormData,
          {
            headers: {
              ...fileFormData.getHeaders(),
              Authorization: req.headers.authorization || "",
            },
          }
        );
        console.log("File upload response:", fileResponse.data);
        pictureUrl = fileResponse.data.url;
      } catch (error) {
        console.error("Error uploading file:", (error as Error).message);
      }
    }

    // Build the new post object. Note that sender is taken from req.params.userName if provided.
    const newPost: IPost = {
      title: body.title,
      content: body.content,
      sender: body.sender,
      pictureUrl: pictureUrl,
      likes: [], // new posts start with no likes
    };

    // Overwrite req.body with the new post object.
    req.body = newPost;
    console.log("New post object:", req.body);

    // Call the parent's create method to perform the actual creation.
    super.create(req, res);
  }

  async getPosts(req: Request, res: Response) {
    super.getAll(req, res, "");
  }

  async getPostById(req: Request, res: Response): Promise<void> {
    super.getById(req, res);
  }

  async getPostsBySender(req: Request, res: Response) {
    // Assumes that the sender field is now the username
    super.getAll(req, res, "sender");
  }

  async updatePost(req: Request, res: Response): Promise<void> {
    console.log("Updating post:", req.params.id);
    const body = req.body;
    console.log("body:", body);

    // Use the current pictureUrl from body or default to an empty string.
    let pictureUrl: string = body.pictureUrl || "";

    // If deletion is requested, explicitly set pictureUrl to an empty string.
    if (body.deletePhoto === "true" || body.deletePhoto === true) {
      pictureUrl = "";
      try {
        const fileResponse = await axios.delete(
          "http://localhost:3000/api/file/" + body.pictureUrl,
          {
            headers: {
              Authorization: req.headers.authorization || "",
            },
          }
        );
        console.log("File deletion response:", fileResponse.data);
      } catch (error) {
        console.error("Error deleting file:", (error as Error).message);
      }
    }

    // If a new file is uploaded, process it.
    if (req.file) {
      console.log("File uploaded for update:", req.file.originalname);
      const fileFormData = new FormData();
      fileFormData.append("file", req.file.buffer, req.file.originalname);

      // Optionally, pass the old picture URL to the file endpoint.
      const oldPath = body.oldPictureUrl;
      console.log("Old picture path:", oldPath);

      try {
        let fileResponse;
        if (oldPath) {
          // Delete the old file
          fileResponse = await axios.put(
            "http://localhost:3000/api/file/" + oldPath,
            fileFormData,
            {
              headers: {
                ...fileFormData.getHeaders(),
                Authorization: req.headers.authorization || "",
              },
            }
          );
        } else {
          fileResponse = await axios.post(
            "http://localhost:3000/api/file/",
            fileFormData,
            {
              headers: {
                ...fileFormData.getHeaders(),
                Authorization: req.headers.authorization || "",
              },
            }
          );
        }
        console.log("File upload response:", fileResponse.data);
        pictureUrl = fileResponse.data.url;
      } catch (error) {
        console.error("Error uploading file:", (error as Error).message);
      }
    }

    // Build the update object for the post with only title, content, and pictureUrl.
    const updatedPost: Partial<IPost> = {
      title: body.title,
      content: body.content,
      pictureUrl: pictureUrl,
    };

    // Overwrite req.body with the updated post object.
    req.body = updatedPost;
    console.log("Updated post object:", req.body);

    // Call the parent's update method to perform the actual update.
    super.update(req, res);
  }

  async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const postId = req.params.id;
      const username: string = req.body.username;
      const userId = req.body.userId;

      // Check if the username is valid
      if (!username || username === "Anonymous") {
        console.error("Invalid username provided:", username);
        res.status(400).json({ error: "Invalid username provided" });
        return;
      }

      console.log(
        "Toggle like requested for post:",
        postId,
        "by user:",
        username
      );
      const post = await postModel.findById(postId);
      if (!post) {
        console.error("Post not found for id:", postId);
        res.status(404).json({ message: "Post not found" });
        return;
      }

      // Ensure the likes array exists
      if (!post.likes) {
        post.likes = [];
      }

      const index = post.likes.indexOf(userId);
      if (index === -1) {
        // User has not liked the post; add the username.
        post.likes.push(userId);
        console.log(`Added ${userId} to likes.`);
      } else {
        // User already liked the post; remove the username.
        post.likes.splice(index, 1);
        console.log(`Removed ${userId} from likes.`);
      }

      await post.save();
      console.log("Post saved successfully with likes:", post.likes);
      res.status(200).json(post);
    } catch (error) {
      console.error("Error toggling like for post", req.params.id, ":", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    super.delete(req, res);
  }
}

export default new PostsController();
