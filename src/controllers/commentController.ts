import { Request, Response } from "express";
import commentModel, { IComment } from "../models/Comments";
import baseController from "./baseController";

class CommentsController extends baseController<IComment> {
  constructor() {
    super(commentModel);
  }

  async createComment(req: Request, res: Response) {
    const comment = {
      content: req.body.content,
      sender: req.body.sender,
      postId: req.body.postId,
    };
    req.body = comment;
    super.create(req, res);
  }

  async getCommentById(req: Request, res: Response): Promise<void> {
    super.getById(req, res);
  }

  async updateComment(req: Request, res: Response): Promise<void> {
    const body = req.body;
    const comment = {
      content: body.content,
      sender: body.sender,
      postId: body.postId,
    };
    req.body = comment;
    super.update(req, res);
  }

  async deleteComment(req: Request, res: Response): Promise<void> {
    super.delete(req, res);
  }

  async getCommentsByPost(req: Request, res: Response) {
    super.getAll(req, res, "postId");
  }
}

export default new CommentsController();
