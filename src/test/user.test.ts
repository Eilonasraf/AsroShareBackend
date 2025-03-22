import request from "supertest";
import appPromise from "../server";
import mongoose from "mongoose";
import userModel from "../models/User";
import axios from "axios";
import { Express } from "express";
import { IUser } from "../models/User";

// Set dummy env variables for the file upload URL construction.
process.env.DOMAIN_BASE = "http://localhost:";
process.env.PORT = "3000";

// Mock axios so we can simulate file upload responses.
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

let app: Express;

type User = IUser & { accessToken?: string; refreshToken?: string };

const NormalUser: User = {
  userName: "NormalUser",
  email: "testNormal@normal.com",
  password: "testpassword",
};

let googleUser: User;

beforeAll(async () => {
  // Initialize the Express app.
  app = await appPromise();

  // Clear the users collection.
  await userModel.deleteMany({});

  await request(app).post("/api/auth/register").send(NormalUser);
  const res_normal = await request(app)
    .post("/api/auth/login")
    .send(NormalUser);
  NormalUser.accessToken = res_normal.body.accessToken;
  NormalUser.refreshToken = res_normal.body.refreshToken;
  NormalUser._id = res_normal.body._id;
  expect(NormalUser.accessToken).toBeDefined();
  expect(NormalUser.refreshToken).toBeDefined();

  googleUser = await userModel.create({
    userName: "TestGoogleUser",
    email: "google@test.com",
    password: "password", // For testing; in real life this should be hashed.
    googleId: "google123",
    bio: "Initial bio",
    profilePictureUrl: "default_profile.png",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("UserController - getUserByUsername", () => {
  test("should get a user by username", async () => {
    console.log("NormalUser.userName", NormalUser.userName);
    const res = await request(app).get(`/api/users/${NormalUser.userName}`);
    expect(res.statusCode).toEqual(200);
    // Assuming the base controller returns an array of users.
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("userName", NormalUser.userName);
  });

  test("should return an empty array if user not found", async () => {
    const res = await request(app).get(`/api/users/nonexistent`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toEqual(0);
  });
});

describe("UserController - getUserById", () => {
  test("should get a user by id", async () => {
    const res = await request(app).get(`/api/users/id/${NormalUser._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("userName", NormalUser.userName);
  });

  test("should return 404 if user not found", async () => {
    // Use a valid Mongo ID format that does not exist.
    const fakeId = "609e1250f3f6c930a0a0a0a0";
    const res = await request(app).get(`/api/users/id/${fakeId}`);
    expect(res.statusCode).toEqual(404);
  });
});

describe("UserController - updateUser", () => {
  test("should update user without file upload", async () => {
    const res = await request(app)
      .put(`/api/users/${NormalUser.userName}`)
      .set("authorization", `JWT ${NormalUser.accessToken}`)
      .send({ userName: "NormalUserUpdated", bio: "Updated bio" });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("userName", "NormalUserUpdated");
    expect(res.body).toHaveProperty("bio", "Updated bio");
    NormalUser.userName = "NormalUserUpdated";
  });

  test("should update user with file upload (default profile picture)", async () => {
    // Simulate axios.post response (for default profile picture case).

    mockedAxios.post.mockResolvedValueOnce({
      data: { url: "http://test.com/normalprofile.png" },
    });

    console.log("buffer", Buffer.from("test"));

    const res = await request(app)
      .put(`/api/users/${NormalUser.userName}`)
      .set("authorization", `JWT ${NormalUser.accessToken}`)
      .field("userName", "NormalUserWithPic")
      .field("bio", "Updated bio with pic")
      .field("oldProfilePictureUrl", "default_profile.png")
      .attach("profilePicture", Buffer.from("test"), "test-profile.png");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("userName", "NormalUserWithPic");
    expect(res.body).toHaveProperty("bio", "Updated bio with pic");
    expect(res.body).toHaveProperty(
      "profilePictureUrl",
      "http://test.com/normalprofile.png"
    );
    NormalUser.userName = "NormalUserWithPic";
  });

  test("should update user with file upload (non-default profile picture)", async () => {
    // Simulate axios.put response (for non-default profile picture case).
    mockedAxios.put.mockResolvedValueOnce({
      data: { url: "http://test.com/normalprofile_updated.png" },
    });

    const buffer = Buffer.from("dummy file content");

    const res = await request(app)
      .put(`/api/users/${NormalUser.userName}`)
      .set("authorization", `JWT ${NormalUser.accessToken}`)
      .field("userName", "NormalUserUpdatedAgain")
      .field("bio", "Updated bio with pic update")
      .field("oldProfilePictureUrl", "existing_profile.png")
      .attach("profilePicture", buffer, "profile.png");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("userName", "NormalUserUpdatedAgain");
    expect(res.body).toHaveProperty("bio", "Updated bio with pic update");
    expect(res.body).toHaveProperty(
      "profilePictureUrl",
      "http://test.com/normalprofile_updated.png"
    );
    NormalUser.userName = "NormalUserUpdatedAgain";
  });

  test("should return error for duplicate username", async () => {
    // Create another user that will cause a duplicate when updating.
    await request(app).post("/api/auth/register").send({
      userName: "DuplicateUser",
      email: "Duplicate@test.com",
      password: "testpassword",
    });

    // Simulate a duplicate error on save.
    const spy = jest
      .spyOn(userModel.prototype, "save")
      .mockImplementationOnce(() => {
        const error = new Error("duplicate key error") as Error & {
          code?: number;
          keyPattern?: Record<string, boolean>;
        };
        error.code = 11000;
        error.keyPattern = { userName: true };
        throw error;
      });

    const res = await request(app)
      .put(`/api/users/${NormalUser.userName}`)
      .set("authorization", `JWT ${NormalUser.accessToken}`)
      .send({ userName: "DuplicateUser", bio: "Another bio" });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty(
      "error",
      "Username already exists, Please choose another one"
    );
    spy.mockRestore();
  });

  test("should return 500 if a server error occurs during update", async () => {
    // Simulate an error during the update process.
    const spy = jest.spyOn(userModel, "findOne").mockImplementationOnce(() => {
      throw new Error("Failed to update user");
    });

    const res = await request(app)
      .put(`/api/users/${NormalUser.userName}`)
      .set("authorization", `JWT ${NormalUser.accessToken}`)
      .send({ userName: "AnotherUpdate", bio: "Another bio" });

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("error", "Failed to update user");
    spy.mockRestore();
  });
});

describe("UserController - updateGoogleUser", () => {
  test("should update Google user with new profile picture", async () => {
    // Mock axios.post to simulate successful file upload.
    mockedAxios.post.mockResolvedValueOnce({
      data: { url: "http://test.com/googleprofile.png" },
    });

    // Create a dummy PNG file buffer (header + extra bytes).
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const dummyPng = Buffer.concat([pngHeader, Buffer.alloc(100, 0)]);

    const res = await request(app)
      .put(`/api/users/google/${googleUser.userName}`)
      .set("authorization", "Bearer dummyToken")
      .field("userName", "UpdatedGoogleUser")
      .field("bio", "Updated bio for google user")
      .attach("profilePicture", dummyPng, "profile.png");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("userName", "UpdatedGoogleUser");
    expect(res.body).toHaveProperty("bio", "Updated bio for google user");
    expect(res.body).toHaveProperty(
      "profilePictureUrl",
      "http://test.com/googleprofile.png"
    );

    // Update the user object to reflect the changes.
    googleUser.userName = "UpdatedGoogleUser";
    googleUser.bio = "Updated bio for google user";
    googleUser.profilePictureUrl = "http://test.com/googleprofile.png";
  });

  test("should update Google user without file upload", async () => {
    const res = await request(app)
      .put(`/api/users/google/${googleUser.userName}`)
      .set("authorization", "Bearer dummyToken")
      .send({
        userName: "UpdatedGoogleUserNoFile",
        bio: "Updated bio no file",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("userName", "UpdatedGoogleUserNoFile");
    expect(res.body).toHaveProperty("bio", "Updated bio no file");
    // Since no file was uploaded, profilePictureUrl should remain unchanged.
    expect(res.body).toHaveProperty(
      "profilePictureUrl",
      googleUser.profilePictureUrl
    );
  });

  test("should return 404 if Google user not found", async () => {
    const res = await request(app)
      .put(`/api/users/google/NonExistentUser`)
      .set("authorization", "Bearer dummyToken")
      .send({ userName: "AnyName", bio: "Any bio" });

    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("error", "User not found");
  });

  test("should return 400 if user is not a Google user", async () => {
    const res = await request(app)
      .put(`/api/users/google/${NormalUser.userName}`)
      .set("authorization", "Bearer dummyToken")
      .send({ userName: "ShouldNotUpdate", bio: "Any bio" });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error", "Not a Google user");
  });

  test("should return 500 if file upload fails", async () => {
    // Simulate a failure in the file upload.
    mockedAxios.post.mockRejectedValueOnce(new Error("Upload error"));

    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const dummyPng = Buffer.concat([pngHeader, Buffer.alloc(100, 0)]);

    const res = await request(app)
      .put(`/api/users/google/${googleUser.userName}`)
      .set("authorization", "Bearer dummyToken")
      .field("userName", "UpdatedGoogleUser")
      .field("bio", "Updated bio for google user")
      .attach("profilePicture", dummyPng, "profile.png");

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty(
      "error",
      "Failed to upload profile picture"
    );
  });
});
