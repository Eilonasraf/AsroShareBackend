import mongoose from "mongoose";

export interface IComment {
  content: string;
  sender: string;
  postId: string;
}

const CommentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true },
  postId: { type: String, required: true },
});

const commentModel = mongoose.model<IComment>("Comment", CommentSchema);

export default commentModel;
