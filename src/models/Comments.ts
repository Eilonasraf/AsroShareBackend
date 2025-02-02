import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
    content: { type: String, required: true }, 
    sender: { type: String, required: true },
    postId: { type: String, required: true }
});

export default mongoose.model('Comment', CommentSchema); // Export the model