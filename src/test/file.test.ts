// fileRoutes.test.js
import request from "supertest";
import express from "express";
import fs from "fs";

// Import the router (adjust the path as needed)
import fileRoutes from "../routes/FileRoute";
import { Request, Response, NextFunction } from "express";

// Mock the auth middleware so it just calls next()
jest.mock("../controllers/authController", () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction): void =>
    next(),
}));

// Mock fs methods to control file system behaviors in tests
jest.mock("fs", () => {
  const originalFs = jest.requireActual("fs");
  return {
    ...originalFs,
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    access: jest.fn((filePath, mode, callback) => callback(null)),
    unlink: jest.fn(() => {}),
  };
});

// Create an Express app and mount the routes for testing
const app = express();
app.use(express.json());
app.use("/api/file", fileRoutes);

describe("File Routes", () => {
  describe("POST /api/file", () => {
    it("should upload a file successfully", async () => {
      const response = await request(app)
        .post("/api/file")
        .attach("file", Buffer.from("dummy content"), "test.txt");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("url");
      // Optionally, verify the filename format (e.g. contains a timestamp and extension)
      expect(response.body.url).toMatch(/\d+\./);
    });

    it("should return error if no file is uploaded", async () => {
      const response = await request(app).post("/api/file");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "No file uploaded");
    });
  });

  describe("PUT /api/file/:filename", () => {
    beforeEach(() => {
      // Reset mocks before each test
      (fs.access as unknown as jest.Mock).mockReset();
      (fs.unlink as unknown as jest.Mock).mockReset();
    });

    it("should replace an existing file successfully", async () => {
      // Simulate that the old file exists
      (fs.access as unknown as jest.Mock).mockImplementation(
        (filePath, mode, callback) => {
          callback(null);
        }
      );
      // Simulate successful deletion of the old file
      (fs.unlink as unknown as jest.Mock).mockImplementation(
        (filePath, callback) => {
          callback(null);
        }
      );

      const response = await request(app)
        .put("/api/file/oldfile.txt")
        .attach("file", Buffer.from("new content"), "new.txt");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "File replaced successfully"
      );
      expect(response.body).toHaveProperty("url");
    });

    it("should return 400 if no new file is uploaded", async () => {
      const response = await request(app).put("/api/file/oldfile.txt");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "No new file uploaded");
    });

    it("should return 404 if the old file does not exist", async () => {
      // Simulate that the old file does not exist
      (fs.access as unknown as jest.Mock).mockImplementation(
        (filePath, mode, callback) => {
          callback(new Error("File not found"));
        }
      );

      const response = await request(app)
        .put("/api/file/nonexistent.txt")
        .attach("file", Buffer.from("new content"), "new.txt");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "File not found");
    });
  });

  describe("DELETE /api/file/:filename", () => {
    beforeEach(() => {
      (fs.unlink as unknown as jest.Mock).mockReset();
    });

    it("should delete a file successfully", async () => {
      // Simulate successful file deletion
      (fs.unlink as unknown as jest.Mock).mockImplementation(
        (filePath, callback) => {
          callback(null);
        }
      );

      const response = await request(app).delete("/api/file/somefile.txt");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "File deleted successfully"
      );
    });

    it("should return 500 if error occurs during deletion", async () => {
      // Simulate an error during file deletion
      (fs.unlink as unknown as jest.Mock).mockImplementation(
        (filePath, callback) => {
          callback(new Error("Deletion error"));
        }
      );

      const response = await request(app).delete("/api/file/somefile.txt");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Error deleting file");
    });
  });
});
