const Router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { SECRET_KEY } = process.env;
const verifyUser = require('../middleware/verifyUser');

Router
    .get('/view', verifyUser, async (req, res) => {
        const { email } = req.query;
        try {
            // Feching user using email
            const result = await pool.query("SELECT id, email, name, profile_pic FROM users WHERE email=$1", [email]);
            if (result.rows.length === 0) return res.status(404).send("No user found");

            res.status(200).json(result.rows[0]);
        } catch (error) {

        }
    })
    .post('/sign-in', async (req, res) => {
        try {
            // Checking if the user exists or not
            const result = await pool.query("SELECT * FROM users WHERE email=$1", [req.body.email]);
            if (result.rows.length === 0) return res.status(401).send("Incorrect email or password");

            // Checking the password
            const checkPassword = await bcrypt.compare(req.body.password, result.rows[0].password);
            if (!checkPassword) return res.status(401).send("Incorrect email or password")

            // Generating JWT token
            const token = jwt.sign({ userId: result.id }, SECRET_KEY);
            const { password, ...otherData } = result.rows[0];

            res.status(200).json({ user: otherData, token });
        } catch (error) {
            res.status(500).send("Error while logging");
        }
    })
    .post('/sign-up', [
        body('name', 'Name is required and it should contain atleast 3 letters').notEmpty().isLength({ min: 3 }),
        body('email', 'Invalid email format').isEmail(),
        body('password').isLength({ min: 8 }).withMessage(`Password should be at least 8 characters long.`)
            .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/).withMessage("Password should contain an Alphabets, Special symbols and number")
    ], async (req, res) => {

        // Checking the condition for all fields
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

        const { email, password, name, profile_pic, role } = req.body;

        if (!['admin', 'user'].includes(role)) return res.status(400).send("Role should be either admin or user");

        try {
            // Checking if the user already exists
            let user = await pool.query(`SELECT email FROM users WHERE email=$1`, [email]);
            if (user.rows.length !== 0) return res.status(400).send("A user with this email already exists");

            // Generating salt of 2^12 rounds
            const salt = await bcrypt.genSalt(12);

            // Hashing the password
            const hashedPassword = await bcrypt.hash(password, salt);

            // Saving the user
            const result = await pool.query(
                "INSERT INTO users (name, email, password, role, profile_pic) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, profile_pic, role",
                [name, email, hashedPassword, role, profile_pic]);
            user = result.rows[0];

            // Generating JWT Token
            const token = jwt.sign({ userId: user.id }, SECRET_KEY);

            res.status(200).json({ user, token });

        } catch (error) {
            res.status(500).send("Unable to create a new user");
        }
    })

    .put('/:id', [
        body('name', 'Name is required and it should contain atleast 3 letters').notEmpty().isLength({ min: 3 }).optional(),
        body('email', 'Invalid email format').isEmail().optional(),
        body('password').isLength({ min: 8 }).withMessage(`Password should be at least 8 characters long.`)
            .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/).withMessage("Password should contain an Alphabets, Special symbols and number").optional()
    ], verifyUser, async (req, res) => {
        const { id } = req.params;

        // Checking if fields are present or not
        if (Object.keys(req.body) === 0) return res.status(400).send("No update fields provided");

        // Checking the condition for all fields
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            // Checking if the user exists
            let user = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
            if (user.rows.length === 0) return res.status(404).send("No user found");

            // Dynamic query which automatically creates a query based upon the parameters passed;
            const updateQuery = "UPDATE users SET " + Object.keys(req.body).map((key, index) => `${key}=$${index + 1}`).join(', ') + " WHERE id=$" + (Object.keys(req.body).length + 1) + ' RETURNING id, email, name, profile_pic';
            user = await pool.query(updateQuery, [...Object.values(req.body), id], (err, result) => {
                if (err?.message)
                    return res.status(400).send(err.message)
                res.status(200).json(result.rows[0]);
            });
        } catch (error) {
            res.status(500).send(error.message || "Error while updating user");
        }
    })

module.exports = Router;