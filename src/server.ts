// Eilon-Asraf-318217619-Arel-Gabay-209626274

import express, { Express } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import cors from "cors";

dotenv.config();

// Swagger setup
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AstroShare API",
      version: "1.0.0",
      description: "A simple AstroShare API documentation",
    },
    servers: [
      {
        url: "http://localhost:" + process.env.PORT,
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};
const specs = swaggerJsdoc(options);

// Import routes
import indexRouter from "./routes/IndexRoute";
import postRouter from "./routes/PostRoute";
import commentRouter from "./routes/CommentRoute";
import authRouter from "./routes/AuthRoute";
import fileRouter from "./routes/FileRoute";
import AstronomyApiRoute from "./routes/AstronomyApiRoute";

// Create a function to initialize the server
const initializeServer = async (): Promise<Express> => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connected to Database");

    const app = express();
    app.use(express.json());

    // Added CORS Middleware Properly
    app.use(
      cors({
        origin: ["http://localhost:5173", "https://yourfrontend.com"], // Change as needed
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // Allow cookies from frontend
      })
    );
    app.options("*", cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Use routers
    app.use("/", indexRouter);
    app.use("/api/posts", postRouter);
    app.use("/api/comments", commentRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/file", fileRouter);
    app.use("/api/astronomy", AstronomyApiRoute);
    app.use("/public", express.static("public"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

    return app;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default initializeServer;
