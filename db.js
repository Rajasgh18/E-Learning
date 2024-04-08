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

const tableExists = async (client, name, query) => {
    const table = await client.query(`SELECT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = $1
    )`, [name]);
    if (!table.rows[0].exists) {
        await client.query(query);
        console.log(`Created ${name} table!`);
    }
}

// Connecting to PostgreSQL
pool.connect(async (err, client, done) => {
    if (err)
        return console.error('Error connecting to PostgreSQL:', err);
    console.log('Connected to PostgreSQL!');

    tableExists(
        client,
        'users',
        `CREATE TABLE users(
            id SERIAL PRIMARY KEY,
            name VARCHAR(20) NOT NULL,
            role VARCHAR(10) NOT NULL,
            email VARCHAR(30) NOT NULL,
            password VARCHAR(100) NOT NULL,
            profile_pic VARCHAR(100)
        )`
    );
    tableExists(
        client,
        'courses',
        `CREATE TABLE courses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            level VARCHAR(50) NOT NULL,
            popularity VARCHAR(50) NOT NULL,
            duration VARCHAR(50) NOT NULL,
            instructor VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            price VARCHAR(20) NOT NULL
        );
        `
    );

});

module.exports = pool;