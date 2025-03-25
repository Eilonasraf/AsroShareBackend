import express from "express";
const router = express.Router();
import authController from "../controllers/authController";
import multer from "multer";

const upload = multer();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     RegisterUser:
 *       type: object
 *       required:
 *         - userName
 *         - email
 *         - password
 *       properties:
 *         userName:
 *           type: string
 *           description: The user's username
 *         email:
 *           type: string
 *           description: The user's email
 *         password:
 *           type: string
 *           description: The user's password
 *         profilePicture:
 *           type: string
 *           format: binary
 *           description: The user's profile picture (optional)
 *       example:
 *         userName: "BobSmith"
 *         email: "bob@gmail.com"
 *         password: "123456"
 *
 *     LoginUser:
 *       type: object
 *       required:
 *         - userName
 *         - password
 *       properties:
 *         userName:
 *           type: string
 *           description: The user's username
 *         password:
 *           type: string
 *           description: The user's password
 *       example:
 *         userName: "BobSmith"
 *         password: "123456"
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registers a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *     responses:
 *       200:
 *         description: The new user registered successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  upload.single("profilePicture"),
  async (req, res, next) => {
    try {
      await authController.register(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/google", authController.googleSignin);

router.post("/google/complete", authController.googleComplete);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Logs in a user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUser'
 *     responses:
 *       200:
 *         description: The user logged in successfully
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Generates a new refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refresh token generated successfully
 *       400:
 *         description: Invalid refresh token
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logs out a user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token
 *     responses:
 *       200:
 *         description: The user logged out successfully
 *       400:
 *         description: Invalid refresh token
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Internal server error
 */
router.post("/logout", authController.logout);

export default router;
