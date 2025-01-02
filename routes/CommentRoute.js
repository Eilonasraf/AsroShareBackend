const express = require('express');
const router = express.Router();
const commentController = require('../controllers/CommentController');

router.post('/', commentController.createComment);

module.exports = router;
