import request from "supertest";
import appPromise from "../server";
import mongoose from "mongoose";
import userModel, { IUser } from "../models/User";
import postModel from "../models/Post";
import testPosts from "./test_post.json";
import { Express } from "express";


let app: Express;

beforeAll( async () => {
    console.log('This runs before all tests');
    app = await appPromise();
    await userModel.deleteMany(); // Clear users collection before tests
    await postModel.deleteMany(); // Clear posts collection before tests
});

afterAll(async () => {
    console.log('This runs after all tests');
    await mongoose.disconnect(); // Close MongoDB connection after tests
});

type User = IUser & {
    accessToken?: string,
    refreshToken?: string
};

const user: User = {
    email: "user1@gmail.com",
    password: "123456"
};

describe("Auth Tests", () => {
    test("Auth Registration", async () => {
        const response = await request(app)
        .post("/api/auth/register")
        .send(user);
        console.log(response.body);
        expect(response.statusCode).toBe(200);
    });

    test ("Auth Registration with existing email", async () => {
        const response = await request(app)
        .post("/api/auth/register")
        .send(user);
        expect(response.statusCode).toBe(500);
    });

    test("Auth Login", async () => {
        const response = await request(app)
        .post("/api/auth/login")
        .send(user);

        expect(response.statusCode).toBe(200);

        user.accessToken = response.body.accessToken;
        user.refreshToken = response.body.refreshToken;

        expect(user.accessToken).toBeDefined();
        expect(user.refreshToken).toBeDefined();

    });

    test("Access Token Are Not The Same", async () => {
        const response = await request(app)
        .post("/api/auth/login")
        .send(user);

        expect(response.statusCode).toBe(200);

        expect(response.body.accessToken).not.toEqual(user.accessToken);
        
    });

    test("Get Protected API", async () => {
        const response = await request(app)
        .post("/api/posts").send(testPosts[2]);

        expect(response.statusCode).not.toBe(201);

        const response2 = await request(app).post("/api/posts")
        .set({
            authorization: 'jwt ' + user.accessToken
        })
        .send(testPosts[2]);

        expect(response2.statusCode).toBe(201);
    });

    test("Get Protected API with invalid token", async () => {
        const response = await request(app).post("/api/posts")
        .set({
            authorization: 'jwt ' + user.accessToken + 'invalid'
        })
        .send(testPosts[2]);

        expect(response.statusCode).toBe(403);
    });

    test("Refresh Token", async () => {
        console.log(user);
        const response = await request(app).post("/api/auth/refresh")
        .send({ refreshToken: user.refreshToken });

        expect(response.statusCode).toBe(200);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();

        user.accessToken = response.body.accessToken;
        user.refreshToken = response.body.refreshToken;

    });

    test("Logout - Invalid Refresh Token", async () => {
        const response = await request(app).post("/api/auth/logout")
        .send({ refreshToken: user.refreshToken });

        expect(response.statusCode).toBe(200);

        const response2 = await request(app).post("/api/auth/refresh")
        .send({ refreshToken: user.refreshToken });

        expect(response2.statusCode).toBe(400);
    });

    test("Refresh Token Multiple Use", async () => {
        // Login
        const response = await request(app).post("/api/auth/login")
        .send({ email: user.email, password: user.password });

        expect(response.statusCode).toBe(200);

        user.accessToken = response.body.accessToken;
        user.refreshToken = response.body.refreshToken;

        // Refresh token - first use
        const response2 = await request(app).post("/api/auth/refresh")
        .send({ refreshToken: user.refreshToken });

        expect(response2.statusCode).toBe(200);
        const newRefreshToken = response2.body.refreshToken;

        // Refresh token - second use with old token
        const response3 = await request(app).post("/api/auth/refresh")
        .send({ refreshToken: user.refreshToken });

        expect(response3.statusCode).toBe(400);

        // try to use the new token and expect 403
        const response4 = await request(app).post("/api/auth/refresh")
        .send({ refreshToken: newRefreshToken });

        expect(response4.statusCode).toBe(400);
    });
    
});