// Eilon-Asraf-318217619-Arel-Gabay-209626274

import express, { Express } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import cors from "cors";
import path from "path";

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
        url: (process.env.DOMAIN_BASE || "") + process.env.PORT,
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
import UserRoute from "./routes/UserRoute";
import AiRoute from "./routes/aiRoute";

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
    //  [
    //       (process.env.DOMAIN_BASE || "") + process.env.PORT,
    //       "https://yourfrontend.com",
    //     ]
    app.use(
      cors({
        origin: "*", // Change as needed
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // Allow cookies from frontend
      })
    );

    app.options("*", cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve the React frontend
    app.use(express.static(path.join(__dirname, "../../front")));
    app.get("/", (req, res) => {
      res.send("Server");
    });

    // Use routers
    app.use("/", indexRouter);
    app.use("/api/posts", postRouter);
    app.use("/api/comments", commentRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/file", fileRouter);
    app.use("/api/astronomy", AstronomyApiRoute);
    app.use("/api/users", UserRoute);
    console.log("Node Env:", process.env.NODE_ENV);
    if (process.env.NODE_ENV === "production") {
      app.use("/public", express.static(path.join(__dirname, "../../public/")));
    } else {
      app.use("/public", express.static(path.join(__dirname, "../public/")));
    }

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
    app.use("/api/ai", AiRoute);

    return app;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default initializeServer;
