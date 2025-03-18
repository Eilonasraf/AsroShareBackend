import request from "supertest";
import appPromise from "../server";
import mongoose from "mongoose";
import commentModel from "../models/Comments";
import postModel from "../models/Post";
import testComments from "./test_comment.json";
import userModel, { IUser } from "../models/User";
import { Express } from "express";

let app: Express;
let postId: string;
let commentId: string;

type User = IUser & { accessToken?: string; refreshToken?: string };

const testUser: User = {
  userName: "TestCommentUser",
  email: "testComment@user.com",
  password: "testpassword",
};

beforeAll(async () => {
  // Initialize app and clear test collections.
  app = await appPromise();
  await commentModel.deleteMany({});
  await postModel.deleteMany({});
  await userModel.deleteMany({});

  // Register and login test user.
  await request(app).post("/api/auth/register").send(testUser);
  const res = await request(app).post("/api/auth/login").send(testUser);
  testUser.accessToken = res.body.accessToken;
  testUser.refreshToken = res.body.refreshToken;
  testUser._id = res.body._id;
  expect(testUser.accessToken).toBeDefined();
  expect(testUser.refreshToken).toBeDefined();

  // Create a post to associate with comments.
  const postRes = await request(app)
    .post("/api/posts")
    .set("authorization", "JWT " + testUser.accessToken)
    .send({
      title: "Test Post for Comments",
      content: "This is a test post for comments",
      sender: testUser.userName,
    });
  expect(postRes.statusCode).toEqual(201);
  expect(postRes.body).toHaveProperty("_id");
  postId = postRes.body._id;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Comments API", () => {
  describe("Create Comment", () => {
    test("should create a new comment", async () => {
      const newCommentData = {
        content: testComments[0].content,
        sender: testUser._id,
        postId: postId,
      };

      const res = await request(app)
        .post("/api/comments")
        .set("authorization", "JWT " + testUser.accessToken)
        .send(newCommentData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body.content).toEqual(newCommentData.content);
      expect(res.body.sender).toEqual(testUser._id);
      expect(res.body.postId).toEqual(postId);
      commentId = res.body._id;
    });

    test("should return 500 if there is a server error during creation", async () => {
      jest.spyOn(commentModel, "create").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app)
        .post("/api/comments")
        .set("authorization", "JWT " + testUser.accessToken)
        .send({
          content: testComments[0].content,
          sender: testUser._id,
          postId: postId,
        });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Get Comment by ID", () => {
    test("should get a comment by its ID", async () => {
      const res = await request(app).get(`/api/comments/${commentId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", commentId);
      expect(res.body.content).toEqual(testComments[0].content);
      expect(res.body.sender).toEqual(testUser._id);
      expect(res.body.postId).toEqual(postId);
    });

    test("should return 404 if the comment is not found", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app).get(`/api/comments/${fakeId}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "not found");
    });

    test("should return 500 if there is a server error", async () => {
      jest.spyOn(commentModel, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app).get(`/api/comments/${commentId}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Update Comment", () => {
    test("should update a comment", async () => {
      const updatedData = {
        content: "Updated comment content",
        sender: testUser._id,
        postId: postId,
      };

      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", commentId);
      expect(res.body.content).toEqual(updatedData.content);
      expect(res.body.sender).toEqual(testUser._id);
      expect(res.body.postId).toEqual(postId);
    });

    test("should return 404 if the comment is not found for update", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .put(`/api/comments/${fakeId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({
          content: "Fake update",
          sender: testUser._id,
          postId: postId,
        });
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "Not found");
    });

    test("should return 500 if there is a server error during update", async () => {
      jest.spyOn(commentModel, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({
          content: "Fake update",
          sender: testUser._id,
          postId: postId,
        });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Get Comments by Post ID", () => {
    test("should get all comments for a post", async () => {
      const res = await request(app).get(`/api/comments/post/${postId}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      // At this point, at least one comment exists (the updated one)
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("postId", postId);
    });

    test("should return 500 if there is a server error when retrieving comments", async () => {
      jest.spyOn(commentModel, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app).get(`/api/comments/post/${postId}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Delete Comment", () => {
    test("should delete a comment", async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("authorization", "JWT " + testUser.accessToken);
      expect(res.statusCode).toEqual(200);
      // The base controller returns a message; adjust as necessary.
      expect(res.body).toHaveProperty("message", "deleted");
    });

    test("should return 404 if the comment is not found for deletion", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .delete(`/api/comments/${fakeId}`)
        .set("authorization", "JWT " + testUser.accessToken);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "not found");
    });

    test("should return 500 if there is a server error during deletion", async () => {
      jest.spyOn(commentModel, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("authorization", "JWT " + testUser.accessToken);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });
});
