import { Request, Response } from 'express';
import postModel from '../models/Post';

const createPost = async (req: Request, res: Response) => {
    const { title, content, sender } = req.body;
    try {
        console.log(req.body);
        const post = new postModel({ title, content, sender });
        await post.save();
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

const getPosts = async (req: Request, res: Response) => {
    try {
        const posts = await postModel.find();
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

const getPostById = async (req: Request, res: Response): Promise<void> => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};
const getPostsBySender = async (req: Request, res: Response) => {
    try {
        const posts = await postModel.find({ sender: req.params.sender });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
}
const updatePost = async (req: Request, res: Response): Promise<void> => {
    const { title, content, sender } = req.body;
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        post.title = title;
        post.content = content;
        post.sender = sender;
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};


export default {
    createPost,
    getPosts,
    getPostById,
    getPostsBySender,
    updatePost
};

