/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import postModel, { IPost } from "../models/Post";
import baseController from "./baseController";

class PostsController extends baseController<IPost> {
  constructor() {
    super(postModel);
  }

  async createPost(req: Request, res: Response) {
    // Use req.params.userName if provided; otherwise, fall back to req.body.sender
    const post: IPost = {
      title: req.body.title,
      content: req.body.content,
      sender: req.params.userName || req.body.sender,
      pictureUrl: req.body.pictureUrl,
      likes: req.body.likes || [],
    };
    req.body = post;
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
    const body = req.body;
    // Update post with the new schema fields; using Partial<IPost> in case not all fields are provided
    const post: Partial<IPost> = {
      title: body.title,
      content: body.content,
      sender: body.sender,
      pictureUrl: body.pictureUrl,
      likes: body.likes,
    };
    req.body = post;
    super.update(req, res);
  }

  async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const postId = req.params.id;
      const username: string = req.body.username;

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

      const index = post.likes.indexOf(username);
      if (index === -1) {
        // User has not liked the post; add the username.
        post.likes.push(username);
        console.log(`Added ${username} to likes.`);
      } else {
        // User already liked the post; remove the username.
        post.likes.splice(index, 1);
        console.log(`Removed ${username} from likes.`);
      }

      await post.save();
      console.log("Post saved successfully with likes:", post.likes);
      res.status(200).json(post);
    } catch (error) {
      console.error("Error toggling like for post", req.params.id, ":", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default new PostsController();
