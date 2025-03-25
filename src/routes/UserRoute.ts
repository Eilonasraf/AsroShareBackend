import express from "express";
import userController from "../controllers/userController";
import multer from "multer";

const router = express.Router();
const upload = multer();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userName:
 *           type: string
 *         email:
 *           type: string
 *         password:
 *           type: string
 *         googleId:
 *           type: string
 *         profilePictureUrl:
 *           type: string
 *         refreshTokens:
 *           type: array
 *           items:
 *             type: string
 *         bio:
 *           type: string
 *       example:
 *         _id: "5f8d0d55b54764421b7156c9"
 *         userName: "johndoe"
 *         email: "john@example.com"
 *         password: "hashedpassword"
 *         googleId: "google-id-123"
 *         profilePictureUrl: "http://example.com/profile.jpg"
 *         refreshTokens: []
 *         bio: "Hello, I am John Doe."
 */

/**
 * @swagger
 * /api/users/{userName}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by username
 *     description: Retrieve a user by their username.
 *     parameters:
 *       - in: path
 *         name: userName
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user to retrieve.
 *     responses:
 *       '200':
 *         description: A user object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found.
 */
router.get("/:userName", userController.getUserByUsername.bind(userController));

/**
 * @swagger
 * /api/users/id/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieve a user by their MongoDB ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ID of the user.
 *     responses:
 *       '200':
 *         description: A user object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found.
 */
router.get("/id/:id", userController.getUserById.bind(userController));

/**
 * @swagger
 * /api/users/{userName}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user
 *     description: Update user's username, profile picture, or bio.
 *     parameters:
 *       - in: path
 *         name: userName
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 description: New username.
 *               bio:
 *                 type: string
 *                 description: User bio.
 *               oldProfilePictureUrl:
 *                 type: string
 *                 description: The current profile picture URL.
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture file.
 *     responses:
 *       '200':
 *         description: The updated user object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad request.
 *       '500':
 *         description: Internal server error.
 */
router.put(
  "/:userName",
  upload.single("profilePicture"),
  userController.updateUser.bind(userController)
);

/**
 * @swagger
 * /api/users/google/{userName}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a Google user
 *     description: Update a Google user's username, profile picture, or bio.
 *     parameters:
 *       - in: path
 *         name: userName
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the Google user to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 description: New username.
 *               bio:
 *                 type: string
 *                 description: User bio.
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture file.
 *     responses:
 *       '200':
 *         description: The updated Google user object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad request.
 *       '500':
 *         description: Internal server error.
 */
router.put(
  "/google/:userName",
  upload.single("profilePicture"),
  userController.updateGoogleUser.bind(userController)
);

export default router;
