/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import appPromise from "../server"; // Your Express app
import mongoose from "mongoose";
import userModel, { IUser } from "../models/User";
import postModel from "../models/Post";
import { Express } from "express";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../controllers/authController";

// Define a type for our test user with token properties.
type User = IUser & { accessToken?: string; refreshToken?: string };

// Test user for registration/login (using username for login)
const testUser: User = {
  userName: "TestUser",
  email: "testuser@example.com",
  password: "testpassword",
};

// Dummy payload to be returned by Google token verification.
const dummyPayload = {
  email: "googleuser@example.com",
  sub: "googleSub123",
  picture: "http://example.com/picture.png",
};

let app: Express;

beforeAll(async () => {
  app = await appPromise();
  // Clear collections
  await userModel.deleteMany({});
  await postModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Auth API", () => {
  // --- Registration ---
  describe("Registration", () => {
    test("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send(testUser);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userName", testUser.userName);
      expect(res.body).toHaveProperty("email", testUser.email);
      expect(res.body).toHaveProperty("profilePictureUrl");
    });

    test("should fail to register with an existing email", async () => {
      // Try registering the same user again.
      const res = await request(app).post("/api/auth/register").send(testUser);
      expect(res.statusCode).toBe(400);
    });

    test("should register a new user with a profile picture", async () => {
      // Prepare new user data.
      const newUser = {
        userName: "FileUser",
        email: "fileupload@example.com",
        password: "filepassword",
      };
      await userModel.deleteMany({ email: newUser.email });
      // Create a dummy buffer to simulate a PNG file.
      const dummyBuffer = Buffer.from("dummy image content");
      // Mock axios.post to simulate a successful file upload.
      const axiosPostSpy = jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: { url: "http://test.com/registeredprofile.png" },
      });
      const res = await request(app)
        .post("/api/auth/register")
        .attach("profilePicture", dummyBuffer, "dummy.png")
        .field("userName", newUser.userName)
        .field("email", newUser.email)
        .field("password", newUser.password);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "profilePictureUrl",
        "http://test.com/registeredprofile.png"
      );
      axiosPostSpy.mockRestore();
    });
  });

  // --- Login ---
  describe("Login", () => {
    test("should login with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ userName: testUser.userName, password: testUser.password });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      testUser.accessToken = res.body.accessToken;
      testUser.refreshToken = res.body.refreshToken;
    });

    test("should fail login with incorrect password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ userName: testUser.userName, password: "wrongpassword" });
      expect(res.statusCode).toBe(400);
    });

    test("should fail login with non-existent username", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ userName: "nonexistent", password: testUser.password });
      expect(res.statusCode).toBe(400);
    });
  });

  // --- Refresh Token ---
  describe("Refresh Token", () => {
    test("should refresh token with valid refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      testUser.accessToken = res.body.accessToken;
      testUser.refreshToken = res.body.refreshToken;
    });

    test("should fail refresh with invalid token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalidtoken" });
      expect(res.statusCode).toBe(403);
    });

    test("should return 400 if refresh token is not provided", async () => {
      const res = await request(app).post("/api/auth/refresh").send({});
      expect(res.statusCode).toBe(400);
    });
  });

  // --- Logout ---
  describe("Logout", () => {
    test("should logout and remove the refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken: testUser.refreshToken });
      expect(res.statusCode).toBe(200);

      const resRefresh = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(resRefresh.statusCode).toBe(400);
    });

    test("should return 400 if refresh token is missing during logout", async () => {
      const res = await request(app).post("/api/auth/logout").send({});
      expect(res.statusCode).toBe(400);
    });
  });

  // --- Protected API ---
  describe("Protected API", () => {
    test("should deny access without a valid token", async () => {
      const res = await request(app).post("/api/posts").send({
        title: "Test",
        content: "Test content",
        sender: testUser.userName,
      });
      expect(res.statusCode).toBe(401);
    });

    test("should allow access with a valid token", async () => {
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .send({
          title: "Protected Test",
          content: "Content",
          sender: testUser.userName,
        });
      expect(res.statusCode).toBe(201);
    });
  });

  // --- Google Signin ---
  describe("Google Signin", () => {
    beforeEach(() => {
      jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          (): Promise<{ getPayload: () => typeof dummyPayload }> =>
            Promise.resolve({ getPayload: () => dummyPayload })
        );
    });
    afterEach(async () => {
      jest.restoreAllMocks();
      await userModel.deleteMany({ email: dummyPayload.email });
    });

    test("should create a new Google user if derived username is available", async () => {
      await userModel.deleteMany({ email: dummyPayload.email });
      const res = await request(app)
        .post("/api/auth/google")
        .send({ credential: "dummyCredential" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userName", "googleuser");
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    test("should return 409 if derived username already exists", async () => {
      await userModel.create({
        email: "conflict@example.com",
        userName: "googleuser",
        password: "hashedpassword",
      });
      const res = await request(app)
        .post("/api/auth/google")
        .send({ credential: "dummyCredential" });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error", "Username already exists");
    });

    test("should return 400 if no email found in Google token", async () => {
      const dummyPayloadNoEmail = {
        sub: "googleSub123",
        picture: "http://example.com/picture.png",
      };

      jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          (): Promise<{ getPayload: () => typeof dummyPayloadNoEmail }> =>
            Promise.resolve({ getPayload: () => dummyPayloadNoEmail })
        );

      const res = await request(app)
        .post("/api/auth/google")
        .send({ credential: "dummyCredential" });
      expect(res.statusCode).toBe(400);
      expect(res.text).toEqual("Google authentication failed: No email found.");
    });
  });

  // --- Google Complete ---
  describe("Google Complete", () => {
    beforeEach(async () => {
      jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          (): Promise<{ getPayload: () => typeof dummyPayload }> =>
            Promise.resolve({ getPayload: () => dummyPayload })
        );
      await userModel.deleteMany({ email: dummyPayload.email });
      await userModel.create({
        email: dummyPayload.email,
        userName: "oldusername",
        googleId: dummyPayload.sub,
        profilePictureUrl: dummyPayload.picture,
      });
    });
    afterEach(async () => {
      jest.restoreAllMocks();
      await userModel.deleteMany({ email: dummyPayload.email });
    });

    test("should update existing Google user with new username when available", async () => {
      const res = await request(app)
        .post("/api/auth/google/complete")
        .send({ credential: "dummyCredential", newUsername: "newusername" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userName", "newusername");
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    test("should return 409 if new username is already taken", async () => {
      await userModel.create({
        email: "another@example.com",
        userName: "takenusername",
        password: "hashedpassword",
      });
      const res = await request(app)
        .post("/api/auth/google/complete")
        .send({ credential: "dummyCredential", newUsername: "takenusername" });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error", "Username already exists");
    });
  });

  // --- Auth Middleware ---
  describe("Auth Middleware", () => {
    beforeAll(() => {
      app.get("/test-auth", authMiddleware, (req, res) => {
        res.status(200).send("OK");
      });
    });

    test("should return 400 if TOKEN_SECRET is not set", async () => {
      const originalTokenSecret = process.env.TOKEN_SECRET;
      process.env.TOKEN_SECRET = "";
      const res = await request(app)
        .get("/test-auth")
        .set("authorization", "Bearer sometoken");
      expect(res.statusCode).toBe(400);
      expect(res.text).toBe("Token secret not set");
      process.env.TOKEN_SECRET = originalTokenSecret;
    });

    test("should return 403 if token is invalid", async () => {
      process.env.TOKEN_SECRET = "testsecret";
      const res = await request(app)
        .get("/test-auth")
        .set("authorization", "Bearer invalidtoken");
      expect(res.statusCode).toBe(403);
      expect(res.text).toBe("Invalid token");
    });
  });

  // --- Edge Cases in Auth Controller ---
  describe("Edge Cases in Auth Controller", () => {
    // Lines 186-187: Error checking for existing user.
    test("should return 500 when error occurs checking existing username", async () => {
      jest.spyOn(userModel, "findOne").mockImplementationOnce(() => {
        throw new Error("Test error in username check");
      });
      const res = await request(app).post("/api/auth/register").send({
        userName: "newUser",
        email: "newuser@example.com",
        password: "password123",
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Server error");
      jest.restoreAllMocks();
    });

    // Lines 193-197: Error checking for existing email.
    test("should return 500 when error occurs checking existing email", async () => {
      // Ensure there's no user with this username in the database.
      await userModel.deleteMany({ userName: "anotherUser" });

      // Spy on findOne and use promise-based mocks.
      const findOneSpy = jest.spyOn(userModel, "findOne");
      // First call: username check resolves to null.
      findOneSpy.mockResolvedValueOnce(null);
      // Second call: email check rejects with an error.
      findOneSpy.mockRejectedValueOnce(new Error("Test error in email check"));

      const res = await request(app).post("/api/auth/register").send({
        userName: "anotherUser",
        email: "anotheruser@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Server error");
      findOneSpy.mockRestore();
    });

    // Line 229: Error uploading file.
    test("should register user with default profile picture if file upload fails", async () => {
      const newUser = {
        userName: "uploadFailUser",
        email: "uploadfail@example.com",
        password: "password123",
      };
      await userModel.deleteMany({ email: newUser.email });
      jest
        .spyOn(axios, "post")
        .mockRejectedValueOnce(new Error("File upload error"));
      const dummyBuffer = Buffer.from("dummy file content");
      const res = await request(app)
        .post("/api/auth/register")
        .attach("profilePicture", dummyBuffer, "dummy.png")
        .field("userName", newUser.userName)
        .field("email", newUser.email)
        .field("password", newUser.password);
      expect(res.statusCode).toBe(200);
      expect(res.body.profilePictureUrl).toBe("default_profile.png");
      jest.restoreAllMocks();
    });

    // Lines 246-247: Registration error.
    test("should return 500 if error occurs during user registration", async () => {
      jest.spyOn(userModel, "create").mockImplementationOnce(() => {
        throw new Error("User creation error");
      });
      const res = await request(app).post("/api/auth/register").send({
        userName: "errorUser",
        email: "erroruser@example.com",
        password: "password123",
      });
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Error registering user");
      jest.restoreAllMocks();
    });

    // Line 257: generateTokens returns null if TOKEN_SECRET is not set.
    test("generateTokens should return null if TOKEN_SECRET is not set during login", async () => {
      const originalTokenSecret = process.env.TOKEN_SECRET;
      process.env.TOKEN_SECRET = "";
      const res = await request(app).post("/api/auth/login").send({
        userName: testUser.userName,
        password: testUser.password,
      });
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Error generating tokens");
      process.env.TOKEN_SECRET = originalTokenSecret;
    });

    // Lines 282-283: Missing credentials in login.
    test("should return 400 if credentials are missing in login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ userName: "", password: "" });
      expect(res.statusCode).toBe(400);
      expect(res.text).toBe("Wrong username or password");
    });

    // Lines 300-301: generateTokens fails in login.
    test("should return 500 if generateTokens fails during login", async () => {
      const originalTokenSecret = process.env.TOKEN_SECRET;
      process.env.TOKEN_SECRET = "";
      const res = await request(app).post("/api/auth/login").send({
        userName: testUser.userName,
        password: testUser.password,
      });
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Error generating tokens");
      process.env.TOKEN_SECRET = originalTokenSecret;
    });

    // Lines 327-329: Error in login try block.
    test("should return 500 if error occurs during login process", async () => {
      const findOneMock = jest
        .spyOn(userModel, "findOne")
        .mockImplementationOnce(() => {
          throw new Error("Login error");
        });
      const res = await request(app).post("/api/auth/login").send({
        userName: "nonexistentUser",
        password: "password",
      });
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Error logging in");
      findOneMock.mockRestore();
    });

    // Lines 343-344: TOKEN_SECRET not set during refresh.
    test("should return 400 if TOKEN_SECRET is not set during token refresh", async () => {
      const originalTokenSecret = process.env.TOKEN_SECRET;
      process.env.TOKEN_SECRET = "";
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "sometoken" });
      expect(res.statusCode).toBe(400);
      expect(res.text).toBe("Token secret not set");
      process.env.TOKEN_SECRET = originalTokenSecret;
    });

    // Lines 360-361: User not found during refresh.
    test("should return 404 if user not found during token refresh", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      const token = jwt.sign(
        { _id: nonExistentId, random: 123 },
        process.env.TOKEN_SECRET || "secret",
        { expiresIn: "1h" }
      );
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: token });
      expect(res.statusCode).toBe(404);
      expect(res.text).toBe("Invalid token");
    });

    // Lines 394-396: Error thrown in refresh try block.
    test("should return 500 if error occurs during token refresh process", async () => {
      // Create a user.
      const user = await userModel.create({
        userName: "errorRefreshUser",
        email: "errorrefresh@example.com",
        password: "hashed",
        profilePictureUrl: "default_profile.png",
      });
      // Generate a valid refresh token.
      const validRefreshToken = jwt.sign(
        { _id: user._id, random: 123 },
        process.env.TOKEN_SECRET || "secret",
        { expiresIn: "1h" }
      );
      // Store the valid token on the user.
      user.refreshTokens = [validRefreshToken];
      await user.save();

      // Spy on findById to throw an error.
      const findByIdMock = jest
        .spyOn(userModel, "findById")
        .mockImplementationOnce(() => {
          throw new Error("Refresh error");
        });

      // Call refresh with the valid token.
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: validRefreshToken });

      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Error refreshing token");
      findByIdMock.mockRestore();
    });

    // Lines 416-417: Invalid token in logout.
    test("should return 403 if token is invalid during logout", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken: "invalidtoken" });
      expect(res.statusCode).toBe(403);
      expect(res.text).toBe("Invalid token");
    });

    // Lines 424-426: User not found during logout.
    test("should return 404 if user not found during logout", async () => {
      const token = jwt.sign(
        { _id: "609e1250f3f6c930a0a0a0a0", random: 123 },
        process.env.TOKEN_SECRET || "secret",
        { expiresIn: "1h" }
      );
      const res = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken: token });
      expect(res.statusCode).toBe(404);
      expect(res.text).toBe("Invalid Token");
    });

    // Line 434: refreshTokens not an array.
    test("should handle case where refreshTokens is not an array during logout", async () => {
      const user = await userModel.create({
        userName: "nonArrayUser",
        email: "nonarray@example.com",
        password: "hashed",
        profilePictureUrl: "default_profile.png",
        refreshTokens: "notanarray" as any,
      });
      const refreshToken = jwt.sign(
        { _id: user._id, random: 123 },
        process.env.TOKEN_SECRET || "secret",
        { expiresIn: "1h" }
      );
      user.refreshTokens = "notanarray" as any;
      await user.save();
      const res = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken });
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe("Logged out");
    });

    // Lines 467-469: Error in logout try block.
    test("should return 500 if error occurs during logout process", async () => {
      const user = await userModel.create({
        userName: "errorLogoutUser",
        email: "errorlogout@example.com",
        password: "hashed",
        profilePictureUrl: "default_profile.png",
        refreshTokens: ["validLogoutToken"],
      });
      const refreshToken = jwt.sign(
        { _id: user._id, random: 123 },
        process.env.TOKEN_SECRET || "secret",
        { expiresIn: "1h" }
      );
      const findByIdAndUpdateMock = jest
        .spyOn(userModel, "findByIdAndUpdate")
        .mockImplementationOnce(() => {
          throw new Error("Logout update error");
        });
      const res = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken });
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Error logging out");
      findByIdAndUpdateMock.mockRestore();
    });
  });
});
