import express from 'express';
const router = express.Router();
import commentController from '../controllers/commentController';

router.post('/', commentController.createComment);
router.get('/:id', commentController.getCommentById);
router.put('/:id', commentController.updateComment);
router.delete('/:id', commentController.deleteComment);
router.get('/post/:postId', commentController.getCommentsByPost);

export default router;
