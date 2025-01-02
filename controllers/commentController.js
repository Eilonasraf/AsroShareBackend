const Comment = require('../models/Comments');

const createComment = async (req, res) => {
    const { content, sender, postId } = req.body;
    try {
        const comment = new Comment({ content, sender, postId });
        await comment.save();
        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCommentById = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        res.status(200).json(comment);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

const updateComment = async (req, res) => {
    const { content, sender, postId } = req.body;
        try {
            const comment = await Comment.findById(req.params.id);
            if (!comment) return res.status(404).json({ message: 'Comment not found' });
            comment.content = content;
            comment.sender = sender;
            comment.postId = postId;
            await comment.save();
            res.json(comment);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
};

const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        await comment.remove();
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCommentsByPost = async (req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.postId });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


module.exports = {
    createComment,
    getCommentById,
    updateComment,
    deleteComment,
    getCommentsByPost
};