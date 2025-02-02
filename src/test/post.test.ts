import request from "supertest";
import appPromise from "../server";
import mongoose from "mongoose";
import Post from "../models/Post";
import testPosts from "./test_post.json";
import { Express } from "express";


let app: Express;
let postId: string;

beforeAll( async () => {
    console.log('This runs before all tests');
    app = await appPromise();
    await Post.deleteMany();
});

afterAll(async () => {
    console.log('This runs after all tests');
    await mongoose.disconnect(); // Close MongoDB connection after tests
});

describe("Create Post", () => {
    test("should create a new post", async () => {
        const res = await request(app)
            .post("/api/posts")
            .send(testPosts[0]);
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty("_id");
        expect(res.body.title).toEqual(testPosts[0].title);
        expect(res.body.content).toEqual(testPosts[0].content);
        expect(res.body.sender).toEqual(testPosts[0].sender);
        
        postId = res.body._id;
    });

    test("should return 500 if there is a server error", async () => {
        // Mock Post.save to throw an error
        jest.spyOn(Post.prototype, 'save').mockImplementationOnce(() => {
            throw new Error("Database save error");
        });

        const res = await request(app)
            .post("/api/posts")
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
        expect(res.body[0].sender).toEqual(testPosts[0].sender);
    });

    test("should return 500 if there is a server error", async () => {
        // Mock Post.find to throw an error
        jest.spyOn(Post, 'find').mockImplementationOnce(() => {
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
        expect(res.body.sender).toEqual(testPosts[0].sender);

    });

    // Test for 404 error when the post is not found
    test("should return 404 if the post does not exist", async () => {
        const fakeId = "000000000000000000000000"; // A non-existent ID
        const res = await request(app).get(`/api/posts/${fakeId}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty("message", "Post not found");
    });

    // Test for 500 error (server error)
    test("should return 500 if there is a server error", async () => {
        // Mock Post.findById to throw an error
        jest.spyOn(Post, 'findById').mockImplementationOnce(() => {
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

        const res = await request(app).get(`/api/posts/sender/${testPosts[0].sender}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toEqual(1);
        expect(res.body[0]).toHaveProperty("_id");
        expect(res.body[0].title).toEqual(testPosts[0].title);
        expect(res.body[0].content).toEqual(testPosts[0].content);
        expect(res.body[0].sender).toEqual(testPosts[0].sender);
    });

    // Test for 500 error (server error)
    test("should return 500 if there is a server error", async () => {
        // Mock Post.find to throw an error
        jest.spyOn(Post, 'find').mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const res = await request(app).get(`/api/posts/sender/${testPosts[0].sender}`);
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
            .send({
                title: updatedPost.title,
                content: updatedPost.content,
                sender: updatedPost.sender,
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("_id");
        expect(res.body.title).toEqual(updatedPost.title);
        expect(res.body.content).toEqual(updatedPost.content);
        expect(res.body.sender).toEqual(updatedPost.sender);
    });

    // Test for 404 error when the post is not found
    test("should return 404 if the post does not exist", async () => {
        const fakeId = "000000000000000000000000"; // A non-existent ID
        const res = await request(app)
            .put(`/api/posts/${fakeId}`)
            .send({
                title: updatedPost.title,
                content: updatedPost.content,
                sender: updatedPost.sender,
            });
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty("message", "Post not found");
    });

    // Test for 500 error (server error)
    test("should return 500 if there is a server error", async () => {
        // Mock Post.findById to throw an error
        jest.spyOn(Post, 'findById').mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const res = await request(app)
            .put(`/api/posts/${postId}`)
            .send({
                title: updatedPost.title,
                content: updatedPost.content,
                sender: updatedPost.sender,
            });
        expect(res.statusCode).toEqual(500);
        expect(res.body).toHaveProperty("error", "Database error");

        // Restore the original implementation
        jest.restoreAllMocks();
    });
});
