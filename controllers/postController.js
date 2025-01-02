const Post = require('../models/Post');

const createPost = async (req, res) => {
    const { title, content, sender } = req.body;
    try {
        const post = new Post({ title, content, sender });
        await post.save();
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createPost
};

