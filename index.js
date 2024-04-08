// Importing packages
const express = require('express');
const app = express();
const CORS = require('cors');
const db = require('./db');

// Importing routes
const userRoute = require('./routes/user');
const coursesRoute = require('./routes/courses');

// Applying CORS and added parsing JSON so that JSON data becomes available in req.body
app.use(CORS());
app.use(express.json());

// Defining Routes
app.use("/api/user", userRoute);
app.use("/api/courses", coursesRoute);

// Starting the server
app.listen(5000, () => {
    console.log("E-Learning Platform api running at http://localhost:5000");
});