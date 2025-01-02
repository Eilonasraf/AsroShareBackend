const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

mongoose
  .connect('mongodb://localhost:27017/WebDB') // The MongoDB database connection string
  .then(() => console.log('Connected to MongoDB on localhost')) // Log on successful connection
  .catch(err => console.error('MongoDB connection error:', err)); // Log any connection errors

const postRoutes = require('./routes/PostRoute'); // Routes related to posts

app.use('/api/posts', postRoutes); // Example: POST /api/posts or GET /api/posts

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});