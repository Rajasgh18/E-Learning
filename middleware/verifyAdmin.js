const jwt = require('jsonwebtoken');
const pool = require('../db');

// Middleware function to verify JWT and check if the user is an admin
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization || req.query.token;

        // Checking if token exists
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        // Verifying the JWT token
        jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized: Invalid token' });
            }

            // Fetching the user's details from the database using the decoded user ID
            const { userId } = decoded;
            const user = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

            // Checking if user exists
            if (user.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const { role } = user.rows[0];

            // Checking if the user's role is admin
            if (role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden: Only admins can perform this action' });
            }

            // User is authenticated and is an admin, proceeding to the next middleware or route handler
            next();
        });
    } catch (error) {
        console.error('Error in verifyAdmin middleware:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = verifyAdmin;
