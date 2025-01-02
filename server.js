const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

mongoose
  .connect('mongodb://localhost:27017/WebDB') // The MongoDB database connection string
  .then(() => console.log('Connected to MongoDB on localhost')) // Log on successful connection
  .catch(err => console.error('MongoDB connection error:', err)); // Log any connection errors


app.get('/', (req, res) => {
    res.send('Hello World!');
});

const postRoutes = require('./routes/PostRoute'); // Routes related to posts

app.use('/api/posts', postRoutes); // Example: POST /api/posts or GET /api/posts

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});