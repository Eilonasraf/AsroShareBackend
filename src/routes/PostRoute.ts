import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';
import { authMiddleware } from '../controllers/authController';

router.post('/', authMiddleware,  postController.createPost.bind(postController));
router.get('/', postController.getPosts.bind(postController)); // Supports filtering by query
router.get('/:id', postController.getPostById.bind(postController));
router.get('/sender/:sender', postController.getPostsBySender.bind(postController));
router.put('/:id', authMiddleware, postController.updatePost.bind(postController));

export default router;



