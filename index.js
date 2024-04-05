const express = require('express');
const app = express();
const CORS = require('cors');
const getPgVersion = require('./db');

getPgVersion();

app.use(CORS());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Hello world");
})

app.listen(5000, () => {
    console.log("E-Learning Platform api running at http://localhost:5000");
})