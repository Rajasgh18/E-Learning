// Importing packages
const express = require('express');
const app = express();
const CORS = require('cors');
const db = require('./db');

// Importing routes
const userRoute = require('./routes/user');

// Applying CORS and added parsing JSON so that JSON data becomes available in req.body
app.use(CORS());
app.use(express.json());

// Defining Routes
app.use("/api/user", userRoute);

// Starting the server
app.listen(5000, () => {
    console.log("E-Learning Platform api running at http://localhost:5000");
});