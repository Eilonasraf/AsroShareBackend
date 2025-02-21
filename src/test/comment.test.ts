import request from "supertest";
import appPromise from "../server";
import mongoose from "mongoose";
import commentModel from "../models/Comments";
import testComments from "./test_comment.json";
import userModel, { IUser } from "../models/User";
import { Express } from "express";

let app: Express;
let postId: string;
let commentId: string;

type User = IUser & { accessToken?: string; refreshToken?: string };

const testUser: User = {
  userName: "Test User",
  email: "test@user.com",
  password: "testpassword",
};

beforeAll(async () => {
  console.log("This runs before all tests");
  app = await appPromise();
  await commentModel.deleteMany();

  await userModel.deleteMany();
  await request(app).post("/api/auth/register").send(testUser);
  const res = await request(app).post("/api/auth/login").send(testUser);
  testUser.accessToken = res.body.accessToken;
  testUser.refreshToken = res.body.refreshToken;
  testUser._id = res.body._id;
  console.log("Test user created with token:", testUser.accessToken);
  expect(testUser.accessToken).toBeDefined();
  expect(testUser.refreshToken).toBeDefined();
});

afterAll(async () => {
  console.log("This runs after all tests");
  await mongoose.disconnect(); // Close MongoDB connection after tests
});

describe("Setup for Comments Tests", () => {
  test("should create a post and retrieve its ID", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: "Test Post for Comments",
        content: "This is a test post for comments",
        sender: "User 1",
      });
    console.log(res.body); // Debugging response if needed
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("_id");
    postId = res.body._id;
  });
});

describe("Create Comment", () => {
  test("should create a new comment", async () => {
    const res = await request(app)
      .post("/api/comments")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        content: testComments[0].content,
        sender: testUser._id,
        postId: postId,
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.content).toEqual(testComments[0].content);
    expect(res.body.sender).toEqual(testUser._id);
    expect(res.body.postId).toEqual(postId);

    commentId = res.body._id;
  });

  test("should return 500 if there is a server error", async () => {
    jest.spyOn(commentModel, "create").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app)
      .post("/api/comments")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        content: testComments[0].content,
        sender: testUser._id,
        postId: postId,
      });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Get Comment by ID", () => {
  test("should get a comment by its ID", async () => {
    const res = await request(app).get(`/api/comments/${commentId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.content).toEqual(testComments[0].content);
    expect(res.body.sender).toEqual(testUser._id);
    expect(res.body.postId).toEqual(postId);
  });

  test("should return 404 if the comment is not found", async () => {
    const fakeId = "000000000000000000000000"; // A non-existent ID
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

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Update Comment", () => {
  test("should update a comment", async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        content: "Updated content",
        sender: testUser._id,
        postId: postId,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.content).toEqual("Updated content");
    expect(res.body.sender).toEqual(testUser._id);
    expect(res.body.postId).toEqual(postId);
  });

  test("should return 404 if the comment is not found", async () => {
    const fakeId = "000000000000000000000000"; // A non-existent ID
    const res = await request(app)
      .put(`/api/comments/${fakeId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        content: "Updated content",
        sender: testUser._id,
        postId: postId,
      });
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("message", "not found");
  });

  test("should return 500 if there is a server error", async () => {
    jest.spyOn(commentModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        content: "Updated content",
        sender: testUser._id,
        postId: postId,
      });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Get Comments by Post ID", () => {
  test("should get all comments for a post", async () => {
    const res = await request(app).get(`/api/comments/post/${postId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty("_id");
    expect(res.body[0].content).toEqual("Updated content");
    expect(res.body[0].sender).toEqual(testUser._id);
    expect(res.body[0].postId).toEqual(postId);
  });

  test("should return 500 if there is a server error", async () => {
    jest.spyOn(commentModel, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get(`/api/comments/post/${postId}`);
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Delete Comment", () => {
  test("should delete a comment", async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "deleted");
  });

  test("should return 404 if the comment is not found", async () => {
    const fakeId = "000000000000000000000000"; // A non-existent ID
    const res = await request(app)
      .delete(`/api/comments/${fakeId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      });
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("message", "not found");
  });

  test("should return 500 if there is a server error", async () => {
    jest.spyOn(commentModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});
