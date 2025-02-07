import express from 'express';
const router = express.Router();
import commentController from '../controllers/commentController';
import { authMiddleware } from '../controllers/authController';

/**
 * @swagger
 * tags:
 *   - name: Comments
 *     description: Comments API
 * 
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - content
 *         - sender
 *         - postId
 *       properties:
 *         content:
 *           type: string
 *           description: The content of the comment
 *         sender:
 *           type: string
 *           description: The user ID who wrote the comment
 *         postId:
 *           type: string
 *           description: The ID of the post this comment belongs to
 *       example:
 *         content: "This is an example comment."
 *         sender: "60f7c1d8b2b3c8123c456789"
 *         postId: "65a2b8e4f3d6a9134b789123"
 */


/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Creates a new comment
 *     tags: 
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user creating the comment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - sender
 *               - postId
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content of the comment
 *               sender:
 *                type: string
 *                description: The user ID who wrote the comment
 *               postId:
 *                 type: string
 *                 description: The ID of the post this comment belongs to
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The comment ID
 *                 content:
 *                   type: string
 *                   description: The content of the comment
 *                 sender:
 *                   type: string
 *                   description: The user who wrote the comment
 *                 postId:
 *                   type: string
 *                   description: The ID of the post this comment belongs to
 *       400:
 *         description: Missing required fields (content or postId)
 *       500:
 *         description: Internal server error
 */
router.post('/', authMiddleware, commentController.createComment.bind(commentController));

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Get a comment by ID
 *     tags: 
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to retrieve
 *     responses:
 *       200:
 *         description: Comment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The comment ID
 *                 content:
 *                   type: string
 *                   description: The content of the comment
 *                 sender:
 *                   type: string
 *                   description: The user who wrote the comment
 *                 postId:
 *                   type: string
 *                   description: The ID of the post this comment belongs to
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', commentController.getCommentById.bind(commentController));

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Updates a comment by ID
 *     tags: 
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content of the comment
 *               sender:
 *                 type: string
 *                 description: The user ID who wrote the comment
 *               postId:
 *                 type: string
 *                 description: The ID of the post this comment belongs to
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The comment ID
 *                 content:
 *                   type: string
 *                   description: The content of the comment
 *                 sender:
 *                   type: string
 *                   description: The user who wrote the comment
 *                 postId:
 *                   type: string
 *                   description: The ID of the post this comment belongs to
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authMiddleware, commentController.updateComment.bind(commentController));

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Deletes a comment by ID
 *     tags: 
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authMiddleware, commentController.deleteComment.bind(commentController));

/**
 * @swagger
 * /api/comments/post/{postId}:
 *   get:
 *     summary: Gets comments by post ID
 *     tags: 
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to retrieve comments for
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Internal server error
 */
router.get('/post/:postId', commentController.getCommentsByPost.bind(commentController));

export default router;
