const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'beaveradmin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'beaverdam',
    password: process.env.DB_PASSWORD || 'beaverpassword',
    port: process.env.DB_PORT || 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error connecting to database:', err.stack);
    }
    console.log('Successful connection to database');
    release();
});

module.exports = pool;