import express from 'express';
const router = express.Router();
import commentController from '../controllers/commentController';
import { authMiddleware } from '../controllers/authController';

router.post('/', authMiddleware, commentController.createComment.bind(commentController));
router.get('/:id', commentController.getCommentById.bind(commentController));
router.put('/:id', authMiddleware, commentController.updateComment.bind(commentController));
router.delete('/:id', authMiddleware, commentController.deleteComment.bind(commentController));
router.get('/post/:postId', commentController.getCommentsByPost.bind(commentController));

export default router;
