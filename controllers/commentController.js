const Comment = require('../models/commentModel');

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

module.exports = {
    createComment,
    getCommentById
};