import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs"; // File system module
import path from "path"; // Path module
import { authMiddleware } from "../controllers/authController";

const router = express.Router();

const base = process.env.DOMAIN_BASE + "/"; // Base URL for file access
const uploadDir = "public/"; // Directory where files will be stored

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Set upload directory
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").filter(Boolean).slice(1).join("."); // Extract file extension
    cb(null, Date.now() + "." + ext); // Rename file to avoid conflicts
  },
});
const upload = multer({ storage: storage });

/**
 * @swagger
 * tags:
 *   - name: Files
 *     description: Files API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/file:
 *   post:
 *     summary: Upload a file
 *     tags:
 *       - Files
 *     description: Uploads a file and returns its URL.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload.
 *     responses:
 *       200:
 *         description: File uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL of the uploaded file.
 */
router.post("/", upload.single("file"), (req: Request, res: Response): void => {
  console.log(req.file);
  if (!req.file) {
    res.status(400).send({ error: "No file uploaded" }); // Validate if a file was provided
    return;
  }
  const fileUrl = req.file.filename; // Construct file URL
  console.log("File uploaded:", fileUrl);
  res.status(200).send({ url: fileUrl }); // Send response with file URL
});

/**
 * @swagger
 * /api/file/{filename}:
 *   put:
 *     summary: Replace an existing file
 *     tags:
 *       - Files
 *     description: Replaces an existing file with a new file.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         description: The name of the file to replace.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The new file to upload and replace the existing one.
 *     responses:
 *       200:
 *         description: File replaced successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *                 url:
 *                   type: string
 *                   description: URL of the replaced file.
 *       400:
 *         description: No file uploaded or invalid file format.
 *       404:
 *         description: File not found.
 *       500:
 *         description: Error during file replacement.
 */
router.put(
  "/:filename",
  authMiddleware,
  upload.single("file"),
  (req: Request, res: Response): void => {
    const oldFilePath = path.join(uploadDir, req.params.filename);
    console.log("PUT request received for file:", req.params.filename);
    console.log("Old file path:", oldFilePath);

    if (!req.file) {
      console.log("Error: No new file uploaded");
      res.status(400).send({ error: "No new file uploaded" });
    }

    // Check if the file exists before replacing it
    fs.access(oldFilePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.log("Error: File not found:", oldFilePath);
        return res.status(404).send({ error: "File not found" });
      }

      console.log("File found. Proceeding with replacement...");

      // Delete the old file
      fs.unlink(oldFilePath, (unlinkErr) => {
        if (unlinkErr) {
          console.log("Error deleting old file:", unlinkErr);
          return res.status(500).send({ error: "Error deleting old file" });
        }

        console.log("Old file deleted successfully.");

        // New file URL
        if (req.file) {
          const fileUrl = req.file.filename;
          console.log("New file uploaded:", req.file.filename);
          console.log("New file URL:", fileUrl);

          return res
            .status(200)
            .send({ message: "File replaced successfully", url: fileUrl });
        } else {
          console.log("Unexpected error: No new file found after upload.");
          return res.status(400).send({ error: "No new file uploaded" });
        }
      });
    });
  }
);

/**
 * @swagger
 * /api/file/{filename}:
 *   delete:
 *     summary: Delete a file
 *     tags:
 *       - Files
 *     description: Removes a file from the server.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         type: string
 *         description: The name of the file to delete.
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       500:
 *         description: Error deleting file
 */
router.delete("/:filename", authMiddleware, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename); // Construct file path

  // Delete the file
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send({ error: "Error deleting file" }); // Handle deletion failure
    }
    res.status(200).send({ message: "File deleted successfully" }); // Send success response
  });
});

export = router;
