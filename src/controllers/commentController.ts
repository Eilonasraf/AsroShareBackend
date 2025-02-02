import { Request, Response } from 'express';
import commentModel from '../models/Comments';

const createComment = async (req: Request, res: Response) => {
    const { content, sender, postId } = req.body;
    try {
        const comment = new commentModel({ content, sender, postId });
        await comment.save();
        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

const getCommentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const comment = await commentModel.findById(req.params.id);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        res.status(200).json(comment);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

const updateComment = async (req: Request, res: Response): Promise<void> => {
    const { content, sender, postId } = req.body;
        try {
            const comment = await commentModel.findById(req.params.id);
            if (!comment) {
                res.status(404).json({ message: 'Comment not found' });
                return;
            }
            comment.content = content;
            comment.sender = sender;
            comment.postId = postId;
            await comment.save();
            res.json(comment);
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
};

const deleteComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const comment = await commentModel.findById(req.params.id);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        await commentModel.deleteOne({ _id: req.params.id });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

const getCommentsByPost = async (req: Request, res: Response) => {
    try {
        const comments = await commentModel.find({ postId: req.params.postId });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

export default {
    createComment,
    getCommentById,
    updateComment,
    deleteComment,
    getCommentsByPost
};
