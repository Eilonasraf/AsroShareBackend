const request = require("supertest");
const appPromise = require("../server");
const mongoose = require('mongoose');
const Comment = require('../models/Comments');
const testComments = require('./test_comment.json');

var app;
let postId;
let commentId;

beforeAll( async () => {
    console.log('This runs before all tests');
    app = await appPromise;
    await Comment.deleteMany();
});

afterAll(async () => {
    console.log('This runs after all tests');
    await mongoose.disconnect(); // Close MongoDB connection after tests
});

describe("Setup for Comments Tests", () => {
    test("should create a post and retrieve its ID", async () => {
        const res = await request(app)
            .post("/api/posts")
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
            .send({
                content: testComments[0].content,
                sender: testComments[0].sender,
                postId: postId, 
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty("_id");
        expect(res.body.content).toEqual(testComments[0].content);
        expect(res.body.sender).toEqual(testComments[0].sender);
        expect(res.body.postId).toEqual(postId); 

        commentId = res.body._id;
    });

    test("should return 500 if there is a server error", async () => {
        jest.spyOn(Comment.prototype, 'save').mockImplementationOnce(() => {
            throw new Error("Database error");
        });
    

        const res = await request(app)
            .post("/api/comments")
            .send({
                content: testComments[0].content,
                sender: testComments[0].sender,
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
        expect(res.body.sender).toEqual(testComments[0].sender);
        expect(res.body.postId).toEqual(postId);
    });

    test("should return 404 if the comment is not found", async () => {
        const fakeId = "000000000000000000000000"; // A non-existent ID
        const res = await request(app).get(`/api/comments/${fakeId}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty("message", "Comment not found");
    });

    test("should return 500 if there is a server error", async () => {
        jest.spyOn(Comment, 'findById').mockImplementationOnce(() => {
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
            .send({
                content: "Updated content",
                sender: "Updated sender",
                postId: postId,
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("_id");
        expect(res.body.content).toEqual("Updated content");
        expect(res.body.sender).toEqual("Updated sender");
        expect(res.body.postId).toEqual(postId);
    });

    test("should return 404 if the comment is not found", async () => {
        const fakeId = "000000000000000000000000"; // A non-existent ID
        const res = await request(app)
            .put(`/api/comments/${fakeId}`)
            .send({
                content: "Updated content",
                sender: "Updated sender",
                postId: postId,
            });
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty("message", "Comment not found");
    });

    test("should return 500 if there is a server error", async () => {
        jest.spyOn(Comment.prototype, 'save').mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const res = await request(app)
            .put(`/api/comments/${commentId}`)
            .send({
                content: "Updated content",
                sender: "Updated sender",
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
        expect(res.body[0].sender).toEqual("Updated sender");
        expect(res.body[0].postId).toEqual(postId);
    });

    test("should return 500 if there is a server error", async () => {
        jest.spyOn(Comment, 'find').mockImplementationOnce(() => {
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
        const res = await request(app).delete(`/api/comments/${commentId}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("message", "Comment deleted");
    });

    test("should return 404 if the comment is not found", async () => {
        const fakeId = "000000000000000000000000"; // A non-existent ID
        const res = await request(app).delete(`/api/comments/${fakeId}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty("message", "Comment not found");
    });

    test("should return 500 if there is a server error", async () => {
        jest.spyOn(Comment, 'findById').mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const res = await request(app).delete(`/api/comments/${commentId}`);
        expect(res.statusCode).toEqual(500);
        expect(res.body).toHaveProperty("error", "Database error");

        // Restore the original implementation
        jest.restoreAllMocks();
    });
});