import request from "supertest";
import appPromise from "../server"; // Ensure your Express app is exported here
import mongoose from "mongoose";
import postModel, { IPost } from "../models/Post";
import userModel, { IUser } from "../models/User";
import testPosts from "./test_post.json";
import { Express } from "express";

let app: Express;
let mainPostId: string; // post created in the Create Post section

type User = IUser & { accessToken?: string; refreshToken?: string };

const testUser: User = {
  userName: "TestPostUser",
  email: "testPost@user.com",
  password: "testpassword",
};

beforeAll(async () => {
  // Initialize the app and clear test collections
  app = await appPromise();
  await postModel.deleteMany({});
  await userModel.deleteMany({});

  // Register and login test user
  await request(app).post("/api/auth/register").send(testUser);
  const res = await request(app).post("/api/auth/login").send(testUser);
  testUser.accessToken = res.body.accessToken;
  testUser.refreshToken = res.body.refreshToken;
  testUser._id = res.body._id;
  expect(testUser.accessToken).toBeDefined();
  expect(testUser.refreshToken).toBeDefined();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Posts API", () => {
  describe("Create Post", () => {
    test("should create a new post", async () => {
      // Use the first post from test_posts.json; override sender to TestUser.userName
      const newPost: IPost = { ...testPosts[0], sender: testUser.userName };
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .send(newPost);
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body.title).toEqual(newPost.title);
      expect(res.body.content).toEqual(newPost.content);
      expect(res.body.sender).toEqual(testUser.userName);
      mainPostId = res.body._id;
    });

    test("should return 500 if there is a server error during creation", async () => {
      jest.spyOn(postModel, "create").mockImplementationOnce(() => {
        throw new Error("Database save error");
      });
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .send(testPosts[0]);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database save error");
      jest.restoreAllMocks();
    });
  });

  describe("Get Posts", () => {
    test("should get all posts", async () => {
      const res = await request(app).get("/api/posts");
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    test("should return 500 if there is a server error", async () => {
      jest.spyOn(postModel, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app).get("/api/posts");
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Get Post by ID", () => {
    test("should get a post by id", async () => {
      const res = await request(app).get(`/api/posts/${mainPostId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", mainPostId);
    });

    test("should return 404 for non-existent post", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app).get(`/api/posts/${fakeId}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "not found");
    });

    test("should return 500 if there is a server error", async () => {
      jest.spyOn(postModel, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app).get(`/api/posts/${mainPostId}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Get Posts by Sender", () => {
    test("should get posts by sender", async () => {
      const res = await request(app).get(
        `/api/posts/sender/${testUser.userName}`
      );
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].sender).toEqual(testUser.userName);
    });

    test("should return 500 if there is a server error", async () => {
      jest.spyOn(postModel, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app).get(
        `/api/posts/sender/${testUser.userName}`
      );
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Update Post", () => {
    test("should update a post", async () => {
      const updatedData = {
        title: "Updated Title",
        content: "Updated content",
        sender: testUser.userName, // not used in update payload
        pictureUrl: "", // no new photo
        likes: [], // not updated
      };
      const res = await request(app)
        .put(`/api/posts/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send(updatedData);
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toEqual(updatedData.title);
      expect(res.body.content).toEqual(updatedData.content);
    });

    test("should return 404 if updating a non-existent post", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .put(`/api/posts/${fakeId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ title: "Fake", content: "Fake", sender: testUser.userName });
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "Not found");
    });

    test("should return 500 on update error", async () => {
      jest.spyOn(postModel, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app)
        .put(`/api/posts/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ title: "Test", content: "Test", sender: testUser.userName });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Toggle Like", () => {
    let togglePostId: string;

    // Create a new post for toggling like so that it is independent.
    beforeAll(async () => {
      const newPost: IPost = { ...testPosts[1], sender: testUser.userName };
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .send(newPost);
      togglePostId = res.body._id;
      console.log("Toggle post ID:", togglePostId);
      expect(togglePostId).toBeDefined();
    });

    test("should add like if not present", async () => {
      const res = await request(app)
        .post(`/api/posts/like/${togglePostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ username: testUser.userName });
      expect(res.statusCode).toEqual(200);
      expect(res.body.likes).toContain(testUser.userName);
    });

    test("should remove like if present", async () => {
      const res = await request(app)
        .post(`/api/posts/like/${togglePostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ username: testUser.userName });
      expect(res.statusCode).toEqual(200);
      expect(res.body.likes).not.toContain(testUser.userName);
    });
  });

  describe("Delete Post", () => {
    test("should delete a post", async () => {
      const res = await request(app)
        .delete(`/api/posts/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken);
      expect(res.statusCode).toEqual(200);
    });

    test("should return 404 for non-existent post deletion", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .delete(`/api/posts/${fakeId}`)
        .set("authorization", "JWT " + testUser.accessToken);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "not found");
    });
  });
});
