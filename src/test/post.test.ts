import request from "supertest";
import appPromise from "../server"; // Ensure your Express app is exported here
import mongoose from "mongoose";
import postModel, { IPost } from "../models/Post";
import userModel, { IUser } from "../models/User";
import testPosts from "./test_post.json";
import { Express } from "express";
import axios from "axios";

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
    test("should create a new post without file upload", async () => {
      // Use the first post from test_posts.json; override sender to testUser._id
      if (!testUser._id) {
        throw new Error("Test user ID is undefined");
      }
      const newPost: IPost = { ...testPosts[0], sender: testUser._id };
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .send(newPost);
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body.title).toEqual(newPost.title);
      expect(res.body.content).toEqual(newPost.content);
      expect(res.body.sender).toEqual(testUser._id);
      mainPostId = res.body._id;
    });

    test("should create a new post with file upload", async () => {
      const dummyBuffer = Buffer.from("dummy image content");
      // Override sender to testUser._id and clear pictureUrl so file upload is processed.
      const newPost = { ...testPosts[0], sender: testUser._id, pictureUrl: "" };
      if (!testUser._id) {
        throw new Error("Test user ID is undefined");
      }
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .field("title", newPost.title)
        .field("content", newPost.content)
        .field("sender", testUser._id.toString()) // Ensure _id is a string
        .attach("photo", dummyBuffer, "dummy.png");
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body.title).toEqual(newPost.title);
      expect(res.body.content).toEqual(newPost.content);
      expect(res.body.sender).toEqual(testUser._id);
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

    // --- New Test: Create Post file upload with axios response simulation (lines 43-44) ---
    test("should create a new post with file upload and handle axios file upload response", async () => {
      const dummyBuffer = Buffer.from("dummy image content");
      const newPost = { ...testPosts[0], sender: testUser._id, pictureUrl: "" };
      if (!testUser._id) {
        throw new Error("Test user ID is undefined");
      }
      // Stub axios.post to simulate file upload response
      const axiosPostSpy = jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: { url: "uploaded.png" },
      });
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .field("title", newPost.title)
        .field("content", newPost.content)
        .field("sender", testUser._id.toString())
        .attach("photo", dummyBuffer, "dummy.png");
      expect(res.statusCode).toEqual(201);
      expect(res.body.pictureUrl).not.toEqual("");
      axiosPostSpy.mockRestore();
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
      // Now sender is stored as the user's ID
      const res = await request(app).get(`/api/posts/sender/${testUser._id}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].sender).toEqual(testUser._id);
    });

    test("should return 500 if there is a server error", async () => {
      jest.spyOn(postModel, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });
      const res = await request(app).get(`/api/posts/sender/${testUser._id}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Update Post", () => {
    test("should update a post without file upload", async () => {
      const updatedData = {
        title: "Updated Title",
        content: "Updated content",
        sender: testUser._id, // using user id
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

    test("should handle deletePhoto update in post", async () => {
      // Simulate deletePhoto scenario: send deletePhoto flag and a non-empty pictureUrl.
      const updateData = {
        title: "Delete Photo Title",
        content: "Content with deletion",
        pictureUrl: "oldpicture.png",
        deletePhoto: "true",
      };
      // Stub axios.delete to simulate file deletion
      const axiosDeleteSpy = jest.spyOn(axios, "delete").mockResolvedValueOnce({
        data: { url: "" },
      });
      const res = await request(app)
        .put(`/api/posts/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send(updateData);
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toEqual(updateData.title);
      // Expect pictureUrl to be empty because deletion was requested
      expect(res.body.pictureUrl).toEqual("");
      axiosDeleteSpy.mockRestore();
    });

    // --- New Test: Update Post deletion error (simulate axios.delete failure) (line 105) ---
    test("should handle error during file deletion update", async () => {
      const updateData = {
        title: "Delete Photo Error",
        content: "Content deletion error test",
        pictureUrl: "oldpicture.png",
        deletePhoto: "true",
      };
      // Stub axios.delete to reject and simulate a deletion error
      const axiosDeleteSpy = jest
        .spyOn(axios, "delete")
        .mockRejectedValueOnce(new Error("Deletion error"));
      const res = await request(app)
        .put(`/api/posts/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send(updateData);
      expect(res.statusCode).toEqual(200);
      expect(res.body.pictureUrl).toEqual("");
      axiosDeleteSpy.mockRestore();
    });

    // --- New Test: Update Post file upload update without oldPictureUrl (lines 137-149) ---
    test("should handle file upload update without oldPictureUrl", async () => {
      const dummyBuffer = Buffer.from("dummy file content no old path");
      const updateData = {
        title: "File Upload No Old",
        content: "Content with file upload no old picture",
      };
      // Stub axios.post (instead of axios.put) to simulate file upload for update when no old path provided
      const axiosPostSpy = jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: { url: "newupload.png" },
      });
      const res = await request(app)
        .put(`/api/posts/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .field("title", updateData.title)
        .field("content", updateData.content)
        // Do not send oldPictureUrl so that else branch is taken.
        .attach("photo", dummyBuffer, "dummy_no_old.png");
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toEqual(updateData.title);
      expect(res.body.content).toEqual(updateData.content);
      expect(res.body.pictureUrl).not.toEqual("");
      axiosPostSpy.mockRestore();
    });

    test("should return 404 if updating a non-existent post", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .put(`/api/posts/${fakeId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ title: "Fake", content: "Fake", sender: testUser._id });
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
        .send({ title: "Test", content: "Test", sender: testUser._id });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Database error");
      jest.restoreAllMocks();
    });
  });

  describe("Toggle Like", () => {
    let togglePostId: string;
    // Create a new post for toggling like so that it is independent.
    beforeAll(async () => {
      if (!testUser._id) {
        throw new Error("Test user ID is undefined");
      }
      const newPost: IPost = { ...testPosts[1], sender: testUser._id };
      const res = await request(app)
        .post("/api/posts")
        .set("authorization", "JWT " + testUser.accessToken)
        .send(newPost);
      togglePostId = res.body._id;
      expect(togglePostId).toBeDefined();
    });

    test("should add like if not present", async () => {
      const res = await request(app)
        .post(`/api/posts/like/${togglePostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ userId: testUser._id, username: testUser.userName });
      expect(res.statusCode).toEqual(200);
      expect(res.body.likes).toContain(testUser._id);
    });

    test("should remove like if present", async () => {
      const res = await request(app)
        .post(`/api/posts/like/${togglePostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ userId: testUser._id, username: testUser.userName });
      expect(res.statusCode).toEqual(200);
      expect(res.body.likes).not.toContain(testUser._id);
    });

    // --- New Test: Toggle Like with invalid username (lines 178-180) ---
    test("should return 400 for invalid username", async () => {
      const res = await request(app)
        .post(`/api/posts/like/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ userId: testUser._id, username: "Anonymous" });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error", "Invalid username provided");
    });

    // --- New Test: Toggle Like when post is not found (lines 191-193) ---
    test("should return 404 if post not found in toggle like", async () => {
      const fakeId = "000000000000000000000000";
      // Stub findById to return null
      const findByIdSpy = jest
        .spyOn(postModel, "findById")
        .mockResolvedValueOnce(null as unknown);
      const res = await request(app)
        .post(`/api/posts/like/${fakeId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ userId: testUser._id, username: testUser.userName });
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("message", "Post not found");
      findByIdSpy.mockRestore();
    });

    // --- New Test: Toggle Like with undefined likes (line 198) ---
    test("should handle undefined likes in toggle like", async () => {
      const fakePost = {
        _id: "fakeUndefinedLikes",
        likes: undefined,
        save: jest.fn().mockResolvedValueOnce(true),
      };
      const findByIdSpy = jest
        .spyOn(postModel, "findById")
        .mockResolvedValueOnce(fakePost as Partial<IPost>);
      const res = await request(app)
        .post(`/api/posts/like/${fakePost._id}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ userId: testUser._id, username: testUser.userName });
      // Our toggleLike should initialize likes and then add the userId.
      expect(fakePost.likes).toBeDefined();
      expect(fakePost.likes).toContain(testUser._id);
      expect(res.statusCode).toEqual(200);
      findByIdSpy.mockRestore();
    });

    // --- New Test: Toggle Like error (lines 216-217) ---
    test("should return 500 on error in toggle like", async () => {
      const findByIdSpy = jest
        .spyOn(postModel, "findById")
        .mockImplementationOnce(() => {
          throw new Error("Toggle error");
        });
      const res = await request(app)
        .post(`/api/posts/like/${mainPostId}`)
        .set("authorization", "JWT " + testUser.accessToken)
        .send({ userId: testUser._id, username: testUser.userName });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Toggle error");
      findByIdSpy.mockRestore();
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
