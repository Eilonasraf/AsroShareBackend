import request from "supertest";
import appPromise from "../server"; // Ensure your Express app is exported from here
import mongoose from "mongoose";
import userModel, { IUser } from "../models/User";
import postModel from "../models/Post";
import testAuthData from "./test_auth.json";
import { Express } from "express";

let app: Express;

type User = IUser & { accessToken?: string; refreshToken?: string };

const testUser: User = {
  userName: testAuthData.userName,
  email: testAuthData.email,
  password: testAuthData.password,
};

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
  describe("Registration", () => {
    test("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send(testUser);
      // Expect 200 OK and user data in response.
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userName", testUser.userName);
      expect(res.body).toHaveProperty("email", testUser.email);
      expect(res.body).toHaveProperty("profilePictureUrl");
    });

    test("should fail to register with an existing email", async () => {
      // Try to register the same user again.
      const res = await request(app).post("/api/auth/register").send(testUser);
      expect(res.statusCode).toBe(500);
    });
  });

  describe("Login", () => {
    test("should login with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      testUser.accessToken = res.body.accessToken;
      testUser.refreshToken = res.body.refreshToken;
    });

    test("should fail login with incorrect password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: "wrongpassword" });
      expect(res.statusCode).toBe(400);
    });

    test("should fail login with non-existent email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: testUser.password,
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("Refresh Token", () => {
    test("should refresh token with valid refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      // Update tokens
      testUser.accessToken = res.body.accessToken;
      testUser.refreshToken = res.body.refreshToken;
    });

    test("should fail refresh with invalid refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalidtoken" });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("Logout", () => {
    test("should logout and remove the refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken: testUser.refreshToken });
      expect(res.statusCode).toBe(200);

      // After logout, using the same refresh token should fail
      const resRefresh = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: testUser.refreshToken });
      expect(resRefresh.statusCode).toBe(400);
    });
  });

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
});
