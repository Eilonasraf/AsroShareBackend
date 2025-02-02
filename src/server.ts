// Eilon-Asraf-318217619-Arel-Gabay-209626274

import express, { Express } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Import routes
import indexRouter from './routes/IndexRoute';
import postRouter from './routes/PostRoute';
import commentRouter from './routes/CommentRoute';


// Create a function to initialize the server
const initializeServer = async (): Promise<Express> => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to Database');

    const app = express();
    app.use(express.json());

    // Use routers
    app.use('/', indexRouter);
    app.use('/api/posts', postRouter);
    app.use('/api/comments', commentRouter);

    return app;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export default initializeServer;
