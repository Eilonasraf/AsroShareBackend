/* eslint-disable @typescript-eslint/no-explicit-any */
// fileHelper.test.ts
import fs from "fs";

import {
  uploadFile,
  replaceFile,
  deleteFile,
} from "../controllers/fileController";

// Mock the fs module methods
jest.mock("fs");

describe("File Helper Functions - Additional Coverage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("uploadFile", () => {
    it("should call mkdirSync if the target directory does not exist (line 18)", async () => {
      const dummyFile: any = {
        originalname: "test.txt",
        path: "/tmp/dummy",
      };

      // Simulate that the target directory does not exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      // Spy on mkdirSync to ensure it's called
      const mkdirSpy = jest
        .spyOn(fs, "mkdirSync")
        .mockImplementation(() => undefined);

      // Simulate a successful rename operation
      (fs.rename as unknown as jest.Mock).mockImplementation(
        (oldPath, newPath, cb) => {
          cb(null);
        }
      );

      const result = await uploadFile(dummyFile);
      expect(mkdirSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should return failure if fs.writeFile fails for a file with a buffer (line 39)", async () => {
      const dummyBuffer = Buffer.from("dummy content");
      const dummyFile: any = {
        originalname: "image.png",
        buffer: dummyBuffer,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // Simulate writeFile error: trigger error branch in the callback
      (fs.writeFile as unknown as jest.Mock).mockImplementation(
        (targetPath, data, cb) => {
          cb(new Error("write error"));
        }
      );

      const result = await uploadFile(dummyFile);
      expect(result.success).toBe(false);
      expect(result.fileName).toBeUndefined();
    });

    it("should return failure when neither file.path nor file.buffer exists (line 47)", async () => {
      const dummyFile: any = {
        originalname: "nofile.txt",
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await uploadFile(dummyFile);
      expect(result.success).toBe(false);
      expect(result.fileName).toBeUndefined();
    });
  });

  describe("replaceFile", () => {
    it("should log an error if fs.unlink fails when replacing a file (line 55)", async () => {
      const dummyFile: any = {
        originalname: "test.txt",
        path: "/tmp/dummy",
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // Simulate a successful rename operation for uploadFile
      (fs.rename as unknown as jest.Mock).mockImplementation(
        (oldPath, newPath, cb) => {
          cb(null);
        }
      );
      // Simulate an unlink error when trying to delete the old file
      (fs.unlink as unknown as jest.Mock).mockImplementation((filePath, cb) => {
        cb(new Error("unlink error"));
      });

      // Spy on console.error to check that the error is logged
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await replaceFile(dummyFile, "oldfile.txt");
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\d+\.txt/);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting old file:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteFile", () => {
    it("should delete a file successfully", async () => {
      (fs.unlink as unknown as jest.Mock).mockImplementation((filePath, cb) => {
        cb(null);
      });

      const result = await deleteFile("test.txt");
      expect(result).toBe(true);
    });

    it("should return false if deletion fails", async () => {
      (fs.unlink as unknown as jest.Mock).mockImplementation((filePath, cb) => {
        cb(new Error("deletion error"));
      });

      const result = await deleteFile("test.txt");
      expect(result).toBe(false);
    });
  });
});
