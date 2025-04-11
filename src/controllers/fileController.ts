// helpers/fileHelper.ts
import fs from "fs";
import path from "path";

let folderPath: string;

if (process.env.NODE_ENV === "production") {
  folderPath = "../../../public";
} else {
  folderPath = "../../public";
}

export async function uploadFile(
  file: Express.Multer.File
): Promise<{ success: boolean; fileName?: string }> {
  // Create a new file name based on the current time and the original file extension
  const newFileName =
    Date.now() +
    "." +
    file.originalname.split(".").filter(Boolean).slice(1).join(".");

  const targetPath = path.join(__dirname, folderPath, newFileName);
  const targetDir = path.join(__dirname, folderPath);

  // Ensure the target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // If file.path exists, we assume Multer used disk storage
  if (file.path) {
    return new Promise((resolve) => {
      fs.rename(file.path, targetPath, (err) => {
        if (err) {
          resolve({ success: false });
        } else {
          resolve({ success: true, fileName: newFileName });
        }
      });
    });
  }

  // If file.path is undefined, we assume Multer used memory storage and a buffer is available
  if (file.buffer) {
    return new Promise((resolve) => {
      fs.writeFile(targetPath, file.buffer, (err) => {
        if (err) {
          resolve({ success: false });
        } else {
          resolve({ success: true, fileName: newFileName });
        }
      });
    });
  }

  return { success: false }; // If neither property exists, return a failure
}

export async function replaceFile(
  file: Express.Multer.File,
  oldFilePath: string
): Promise<{ success: boolean; fileName?: string }> {
  const response = await uploadFile(file);
  if (response.success) {
    fs.unlink(path.join(__dirname, folderPath, oldFilePath), (err) => {
      if (err) {
        console.error("Error deleting old file:", err);
      } else {
        console.log("Old file deleted successfully.");
      }
    });
  }

  return response;
}

export async function deleteFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.unlink(path.join(__dirname, "../../../public", filePath), (err) => {
      if (err) {
        console.error("Error deleting file:", err);
        resolve(false);
      } else {
        console.log("File deleted successfully.");
        resolve(true);
      }
    });
  });
}
