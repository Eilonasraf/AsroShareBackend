import express, { Request, Response } from "express";
import { authMiddleware } from "../controllers/authController";
import { generateGeminiDescription } from "../services/aiService";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: AI
 *     description: AI-powered features using Google Gemini
 */

/**
 * @swagger
 * /api/ai/generate:
 *   get:
 *     summary: Generate an AI description using Gemini
 *     tags:
 *       - AI
 *     security:
 *       - bearerAuth: []
 *     description: Generates an AI description based on a user-provided prompt using Google Gemini.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The prompt text to generate the description from
 *             example:
 *               prompt: "Write a short description about a trip to the desert"
 *     responses:
 *       200:
 *         description: Successfully generated description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 description:
 *                   type: string
 *                   example: "An unforgettable journey across golden dunes under a blazing sun."
 *       400:
 *         description: Bad request - missing prompt
 *       401:
 *         description: Unauthorized - missing or invalid JWT
 *       500:
 *         description: Server error - failed to generate description
 */
router.get(
  "/generate",
  authMiddleware, // require JWT auth
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Use req.query instead of req.body for GET requests
      const prompt = req.query.prompt as string;

      if (!prompt) {
        res.status(400).json({ message: "Prompt is required" });
        return;
      }

      const description = await generateGeminiDescription(prompt);
      console.log("Generated description:", description);
      res.status(200).json({ description });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error generating description:", error.message);
      } else {
        console.error("Error generating description:", error);
      }
      res.status(500).json({ message: "Failed to generate description" });
    }
  }
);

export default router;
