const { Pool } = require('pg');

// Create a pool with environment variables
const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: {
        rejectUnauthorized: false,
    },
    sslmode: 'require',
});

// Connecting to PostgreSQL
pool.connect(async (err, client, done) => {
    if (err)
        return console.error('Error connecting to PostgreSQL:', err);
    console.log('Connected to PostgreSQL!');

    const userTableExists = await client.query(`SELECT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = 'users'
    )`);
    if (!userTableExists.rows[0].exists) {
        await client.query(`CREATE TABLE users(
            id SERIAL PRIMARY KEY,
            name VARCHAR(20),
            email VARCHAR(30),
            password VARCHAR(100),
            profile_pic VARCHAR(100)
            )`);
        console.log("Created User table!");
    }

});

module.exports = pool;