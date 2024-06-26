const Router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { SECRET_KEY } = process.env;
const verifyUser = require('../middleware/verifyUser');
const resend = require('../resend');

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

            // Sending Signup confirmation Email to the user
            resend.emails.send({
                from: 'onboarding@resend.dev',
                to: user.email,
                subject: 'Welcome to Our Platform!',
                html: `
                <p>Dear ${user.name},</p>

                <p>Thank you for signing up for <strong>E-Learning Platform!</strong> We're excited to have you join our community.</p>

                <p>Your account has been successfully created, and you can now log in using the following credentials:</p>

                <p><strong>Email: ${user.email}</strong></p>

                <p>We're committed to providing you with a seamless and enjoyable experience on our platform. If you have any questions or need assistance, feel free to reach out to our support team.</p>

                <p>Best regards,</p>
                <p>E-Learning</p>
                `
            });
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

            user = user.rows[0];
            if (req.body.password) {
                // Generating salt of 2^12 rounds
                const salt = await bcrypt.genSalt(12);

                // Hashing the password
                req.body.password = await bcrypt.hash(req.body.password, salt);
                console.log(req.body.password);
            }

            // Dynamic query which automatically creates a query based upon the parameters passed;
            const updateQuery = "UPDATE users SET " + Object.keys(req.body).map((key, index) => `${key}=$${index + 1}`).join(', ') + " WHERE id=$" + (Object.keys(req.body).length + 1) + ' RETURNING id, email, name, profile_pic';
            user = await pool.query(updateQuery, [...Object.values(req.body), id]);
            user = user.rows[0];
            resend.emails.send({
                from: 'onboarding@resend.dev',
                to: user.email,
                subject: 'Welcome to Our Platform!',
                html: `
                <p>Dear ${user.name},</p>

                <p>We wanted to inform you that your account information has been successfully updated on <strong>E-learning</strong>.</p>
              
                <p>Here are the details of the changes:</p>
                <ul>
                ${Object.keys(req.body).map((key) => {
                    if (key === "password") {
                        return `<li><strong>Password Changed:</strong> Password updated successfully</li>`;
                    } else {
                        return `<li><strong>Updated ${key[0].toUpperCase() + key.substring(1)}:</strong> ${req.body[key]}</li>`;
                    }
                }).join('')}
                </ul >
              
                <p>If you did not make these changes or believe your account has been compromised, please contact our support team immediately.</p>
              
                <p>Thank you for keeping your information up-to-date. If you have any questions or concerns, feel free to reach out to us.</p>
              
                <p>Best regards,<br>
                E-learning</p>
`
            });
            res.status(200).json(user);

        } catch (error) {
            res.status(500).send(error.message || "Error while updating user");
        }
    })

    // Enrolling routes
    .get('/courses/:id', verifyUser, async (req, res) => {
        try {
            // Checking if the user exists
            let user = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
            if (user.rows.length === 0) return res.status(404).send("No user found");

            // Creating a query such that both user's and course's attributes are shown in the output
            const query = `SELECT uc.id AS enrollment_id,
                    u.id AS user_id,
                    u.name AS user_name,
                    u.email AS user_email,
                    c.id AS course_id,
                    c.name AS course_name,
                    c.category AS course_category,
                    c.level AS course_level,
                    c.popularity AS course_popularity,
                    c.duration AS course_duration,
                    c.instructor AS course_instructor,
                    c.description AS course_description,
                    c.price AS course_price
                FROM user_course uc
                JOIN users u ON uc.userId = u.id
                JOIN courses c ON uc.courseId = c.id
                WHERE uc.userId = $1
    `
            const enrollment = await pool.query(query, [req.params.id]);

            // Checking if enrollments exists
            if (enrollment.rows.length === 0) return res.status(404).send("No enrollments found");
            res.status(200).json(
                {
                    result: enrollment.rows.length,
                    enrolled_course: enrollment.rows
                }
            );

        } catch (error) {
            res.status(500).send(error.message || "Error occurred while fetching users course");
        }
    })
    .post('/enroll/:id', verifyUser, async (req, res) => {
        const courseId = req.params.id;
        const userId = req.body.id;

        try {
            // Checking if the user exists
            let user = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
            if (user.rows.length === 0) return res.status(404).send("No user exists with this userId");

            // Checking if the course exists
            let course = await pool.query("SELECT * FROM courses WHERE id=$1", [courseId]);
            if (course.rows.length === 0) return res.status(404).send("No course exists with this courseId");

            // Checking if the user is already enrolled or not
            let enroll = await pool.query("SELECT * FROM user_course WHERE userId=$1 AND courseId=$2", [userId, courseId]);
            if (enroll.rows.length !== 0) return res.status(400).send("User is already enrolled in this course");

            // Enrolling the user to the respective course
            enroll = await pool.query("INSERT INTO user_course (userId, courseId) VALUES ($1, $2) RETURNING *", [userId, courseId]);
            user = user.rows[0];
            course = course.rows[0];

            // Sending Email for course confimation to the user
            resend.emails.send({
                from: 'onboarding@resend.dev',
                to: user.email,
                subject: `Enrollment Confirmation`,
                html: `
                <p> Dear ${user.name},</p>

                <p>We are pleased to inform you that you have been successfully enrolled in the course <strong>"${course.name}"</strong>.</p>

                <h4>Course Details:</h4>
                <p>- Name: ${course.name}</p>
                <p>- Category: ${course.category}</p>
                <p>- Level: ${course.level}</p>
                <p>- Duration: ${course.duration}</p>
                <p>- Instructor: ${course.instructor}</p>
                <p>- Popularity: ${course.popularity}</p>
                <p>- Description: ${course.description}</p>
                <p>- Price: ${course.price}</p>

                <p>Thank you for choosing our platform for your learning journey. If you have any questions or need further assistance, feel free to contact us.</p>

                <p>Best regards,</p>
                <p>E-Learning</p>
`
            });
            res.status(200).json(enroll.rows[0]);

        } catch (error) {
            res.status(500).send(error.message || "Error occurred while enrolling");
        }
    })

module.exports = Router;