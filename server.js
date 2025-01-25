// Eilon-Asraf-318217619-Arel-Gabay-209626274

const express = require('express');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');


const promise = new Promise((resolve, reject) => {
  const db = mongoose.connection;
  db.on('error', (error) => console.log(error));
  db.once('open', () => console.log('Connected to Database'));

  mongoose.connect(process.env.DATABASE_URL)
  .catch((error) => console.error('MongoDB connection error:', error))
  .then(() => {
    console.log('Connected to Database');

    const app = express();

    app.use(express.json());
    // app.use(express.urlencoded({ extended: true }));

    const indexRouter = require('./routes/IndexRoute');
    app.use('/', indexRouter);

    const postRouter = require('./routes/PostRoute');
    app.use('/api/posts', postRouter);

    const commentRouter = require('./routes/CommentRoute');
    app.use('/api/comments', commentRouter);

    resolve(app);
  })
  .catch((error) => {
    console.log(error);
  });
});

module.exports = promise; // Export the promise
