import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
    title: { type: String, required: true }, 
    content: { type: String, required: true }, 
    sender: { type: String, required: true }, 
    });

export default mongoose.model('Post', PostSchema); // Export the model