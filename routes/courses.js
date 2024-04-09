const Router = require('express').Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db');

Router
    // Get route using pagination
    .get('/', async (req, res) => {
        let { page } = req.query;
        page = parseInt(page);

        // Checking if the page is correct
        if (page < 1 || isNaN(page)) return res.status(400).send("Invalid Page number");

        const pageSize = 10;
        const offset = (page - 1) * pageSize;

        try {
            // Fetching courses according to the page
            const result = await pool.query("SELECT * FROM courses LIMIT $1 OFFSET $2", [pageSize, offset]);

            // Checking if the courses exists for that page
            if (result.rows.length === 0) return res.status(200).send("No courses found for the specified page");

            res.status(200).json({
                page,
                pageSize,
                results: result.length,
                courses: result.rows
            });
        } catch (error) {
            res.status(500).send(error.message || "Error While fetching courses");
        }
    })

    // Filter route
    .get('/filter', async (req, res) => {
        let { page, ...filter } = req.query;
        page = parseInt(page);

        // Checking if the page is correct
        if (page < 1 || isNaN(page)) return res.status(400).send("Invalid Page number");

        const pageSize = 10;
        const offset = (page - 1) * pageSize;

        try {
            // Creating a query according to the given filters
            const query = `SELECT * FROM courses WHERE ${Object.keys(filter).map((key, index) => `${key}=$${index + 1}`).join(" AND ")} LIMIT $${Object.keys(filter).length + 1} OFFSET $${Object.keys(filter).length + 2}`;
            const result = await pool.query(query, [...Object.values(filter), pageSize, offset]);

            // Checking if the courses exists for the specified filter
            if (result.rows.length === 0) return res.status(200).send("No courses match the filter criteria");

            res.status(200).json({
                page,
                results: result.rows.length,
                pageSize,
                courses: result.rows
            });
        } catch (error) {
            res.status(500).send(error.message || "Error while filter courses");
        }
    })

    // Upload all the courses at once
    .post('/all', async (req, res) => {
        try {
            const courses = req.body;
            for (const course of courses) {
                const query = "INSERT INTO courses (name, category, level, popularity, duration, instructor, description, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
                await pool.query(query, [...Object.values(course)], (err) => {
                    if (err?.message)
                        console.log(err.message)
                });
            }
            res.status(200).send("Saved all successufully");
        } catch (error) {
            res.status(500).send(error.message || "Error while adding multiple courses");
        }
    })

    // Admin Privileges Route
    .get('/:id', async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM courses WHERE id=$1", [req.params.id]);
            if (result.rows.length === 0) return res.status(404).send("No course found with this id");
            res.status(200).json(result.rows[0]);
        } catch (error) {
            res.status(500).send(error.message || "Error occurred while fetching course");
        }
    })

    .post('/', [
        body('name', "Name cannot be empty").notEmpty(),
        body('category', "Category cannot be empty").notEmpty(),
        body('level', "Level cannot be empty").notEmpty(),
        body('popularity', "Popularity cannot be empty").notEmpty(),
        body('duration', "Duration cannot be empty").notEmpty(),
        body('instructor', "Instructor cannot be empty").notEmpty(),
        body('description', "Description cannot be empty").notEmpty(),
        body('price', "Price cannot be empty").notEmpty(),
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        try {
            const result = await pool.query("INSERT INTO courses (name, category, level, popularity, duration, instructor, description, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [...Object.values(req.body)]);
            res.status(200).json(result.rows[0]);
        } catch (error) {
            res.status(500).send(error.message || "Error occurred while adding course");
        }
    })

    .put('/:id', [
        body('name', "Name cannot be empty").notEmpty().optional(),
        body('category', "Category cannot be empty").notEmpty().optional(),
        body('level', "Level cannot be empty").notEmpty().optional(),
        body('popularity', "Popularity cannot be empty").notEmpty().optional(),
        body('duration', "Duration cannot be empty").notEmpty().optional(),
        body('instructor', "Instructor cannot be empty").notEmpty().optional(),
        body('description', "Description cannot be empty").notEmpty().optional(),
        body('price', "Price cannot be empty").notEmpty().optional(),
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        if (Object.keys(req.body).length === 0) return res.status(400).send("Atleast 1 field is requried");

        try {
            const updateQuery = "UPDATE courses SET " + Object.keys(req.body).map((key, index) => `${key}=$${index + 1}`).join(', ') + " WHERE id=$" + (Object.keys(req.body).length + 1) + ' RETURNING *';
            console.log(updateQuery)
            const result = await pool.query(updateQuery, [...Object.values(req.body), req.params.id]);
            res.status(200).json(result.rows[0]);

        } catch (error) {
            res.status(500).send(error.message || "Error occurred while updating course");
        }
    })

    .delete('/:id', async (req, res) => {
        try {
            await pool.query("DELETE FROM courses WHERE id=$1", [req.params.id]);
            res.status(200).send("Course Deleted successfully");
        } catch (error) {
            res.status(500).send(error.message || "Error occurred while deleting course");
        }
    })

module.exports = Router;