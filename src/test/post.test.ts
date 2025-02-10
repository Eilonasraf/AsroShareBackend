import request from "supertest";
import appPromise from "../server";
import mongoose from "mongoose";
import postModel from "../models/Post";
import testPosts from "./test_post.json";
import userModel, { IUser } from "../models/User";
import { Express } from "express";

let app: Express;
let postId: string;

type User = IUser & { accessToken?: string; refreshToken?: string };

const testUser: User = {
  name: "Test User",
  email: "test@user.com",
  password: "testpassword",
};

beforeAll(async () => {
  console.log("This runs before all tests");
  app = await appPromise();
  await postModel.deleteMany();

  await userModel.deleteMany();
  await request(app).post("/api/auth/register").send(testUser);
  const res = await request(app).post("/api/auth/login").send(testUser);
  testUser.accessToken = res.body.accessToken;
  testUser.refreshToken = res.body.refreshToken;
  testUser._id = res.body._id;
  console.log("Test user created with token:", testUser);
  expect(testUser.accessToken).toBeDefined();
  expect(testUser.refreshToken).toBeDefined();
});

afterAll(async () => {
  console.log("This runs after all tests");
  await mongoose.disconnect(); // Close MongoDB connection after tests
});

describe("Create Post", () => {
  test("should create a new post", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send(testPosts[0]);
    console.log("Response body:", res.body);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.title).toEqual(testPosts[0].title);
    expect(res.body.content).toEqual(testPosts[0].content);
    expect(res.body.sender).toEqual(testUser._id);

    postId = res.body._id;
  });

  test("should return 500 if there is a server error", async () => {
    jest.spyOn(postModel, "create").mockImplementationOnce(() => {
      throw new Error("Database save error");
    });

    const res = await request(app)
      .post("/api/posts")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send(testPosts[0]);
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database save error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Get Posts", () => {
  test("should get all posts", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0]).toHaveProperty("_id");
    expect(res.body[0].title).toEqual(testPosts[0].title);
    expect(res.body[0].content).toEqual(testPosts[0].content);
    expect(res.body[0].sender).toEqual(testUser._id);
  });

  test("should return 500 if there is a server error", async () => {
    // Mock Post.find to throw an error
    jest.spyOn(postModel, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get("/api/posts");
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Get Post by ID", () => {
  test("should get a post by id", async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.title).toEqual(testPosts[0].title);
    expect(res.body.content).toEqual(testPosts[0].content);
    expect(res.body.sender).toEqual(testUser._id);
  });

  // Test for 404 error when the post is not found
  test("should return 404 if the post does not exist", async () => {
    const fakeId = "000000000000000000000000"; // A non-existent ID
    const res = await request(app).get(`/api/posts/${fakeId}`);
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("message", "not found");
  });

  // Test for 500 error (server error)
  test("should return 500 if there is a server error", async () => {
    // Mock Post.findById to throw an error
    jest.spyOn(postModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe("Get Posts by Sender", () => {
  test("should get posts by sender", async () => {
    const res = await request(app).get(`/api/posts/sender/${testUser._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0]).toHaveProperty("_id");
    expect(res.body[0].title).toEqual(testPosts[0].title);
    expect(res.body[0].content).toEqual(testPosts[0].content);
    expect(res.body[0].sender).toEqual(testUser._id);
  });

  // Test for 500 error (server error)
  test("should return 500 if there is a server error", async () => {
    // Mock Post.find to throw an error
    jest.spyOn(postModel, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get(
      `/api/posts/sender/${testPosts[0].sender}`
    );
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

const updatedPost = {
  title: "Updated Post",
  content: "This is an updated post",
  sender: "Updated Sender",
};

describe("Update Post", () => {
  test("should update a post", async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: updatedPost.title,
        content: updatedPost.content,
        sender: testUser._id,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.title).toEqual(updatedPost.title);
    expect(res.body.content).toEqual(updatedPost.content);
    expect(res.body.sender).toEqual(testUser._id);
  });

  // Test for 404 error when the post is not found
  test("should return 404 if the post does not exist", async () => {
    const fakeId = "000000000000000000000000"; // A non-existent ID
    const res = await request(app)
      .put(`/api/posts/${fakeId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: updatedPost.title,
        content: updatedPost.content,
        sender: testUser._id,
      });
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("message", "not found");
  });

  // Test for 500 error (server error)
  test("should return 500 if there is a server error", async () => {
    // Mock Post.findById to throw an error
    jest.spyOn(postModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: updatedPost.title,
        content: updatedPost.content,
        sender: testUser._id,
      });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Database error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});
