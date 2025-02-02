import express from 'express';
const router = express.Router();
import postController from '../controllers/postController';

router.post('/', postController.createPost);
router.get('/', postController.getPosts); // Supports filtering by query
router.get('/:id', postController.getPostById);
router.get('/sender/:sender', postController.getPostsBySender);
router.put('/:id', postController.updatePost);

export default router;



