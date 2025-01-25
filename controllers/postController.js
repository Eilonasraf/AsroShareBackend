const Post = require('../models/Post');

const createPost = async (req, res) => {
    const { title, content, sender } = req.body;
    try {
        console.log(req.body);
        const post = new Post({ title, content, sender });
        await post.save();
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getPosts = async (req, res) => {
    try {
        const posts = await Post.find();
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const getPostsBySender = async (req, res) => {
    try {
        const posts = await Post.find({ sender: req.params.sender });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
const updatePost = async (req, res) => {
    const { title, content, sender } = req.body;
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        post.title = title;
        post.content = content;
        post.sender = sender;
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createPost,
    getPosts,
    getPostById,
    getPostsBySender,
    updatePost
};

