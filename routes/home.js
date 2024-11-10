const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const csurf = require('csurf');

const csrfProtection = csurf();

router.get('/', (req, res) => {
    res.render('home', {
        users: null,
        session: req.session,
        csrfMessage: null
    });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt for:", username);
    try {
        const query = 'SELECT * FROM users_secure WHERE username = $1';
        const result = await db.query(query, [username]);

        if (result.rows.length === 0) {
            return res.render('home', { 
                users: null, 
                session: req.session, 
                loginError: 'Invalid username or password', 
                csrfMessage: null
            });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.hashed_password);
        console.log("Password match result:", passwordMatch);
        if (passwordMatch) {
            req.session.userId = user.id;
            req.session.username = user.username;
        
            req.session.save((err) => {
                if (err) {
                    return res.status(500).send('Server error');
                }
                res.redirect('/');
            });
        } else {
            res.render('home', { 
                users: null, 
                session: req.session, 
                loginError: 'Invalid username or password', 
                csrfMessage: null
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Server error');
    }
});

router.post('/lookup_user', (req, res) => {
    let { username } = req.body;
    const secure_mode = req.body.secure_mode === 'on';
    const use_secure_table = req.body.use_secure_table === 'on';

    const table = use_secure_table ? 'users_secure' : 'users';

    if (secure_mode) {
        let newusername = username.replace(/[^a-zA-Z0-9]/g, '');
        if ( newusername != username ) {
            return res.render('home', { users: "Invalid field input." ,
                session: req.session,
                csrfMessage: null
            });
        }
        const query = `SELECT username, email FROM ${table} WHERE username = $1`;
        db.query(query, [username], (err, result) => {
            if (err) {
                console.error('Error while searching for user.', err);
                return res.status(500).send('Error while searching for user.');
            }
            res.render('home', { users: result.rows,
                session: req.session,
                csrfMessage: null
            });
        });
    } else {
        const query = `SELECT username, email FROM ${table} WHERE username = '${username}'`;
        db.query(query, (err, result) => {
            if (err) {
                console.error('Error while searching for user.', err);
                return res.status(500).send('Error while searching for user.');
            }
            res.render('home', { users: result.rows,
                session: req.session,
                csrfMessage: null
            });
        });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).send('Server error during logout');
        }
        res.redirect('/');
    });
});

router.post('/change_email', (req, res, next) => {
    if (req.session.secureMode) {
        csrfProtection(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
    const { new_email } = req.body;
    if (!req.session.userId) {
        return res.status(403).render('home', { 
            session: req.session, 
            csrfMessage: 'Access denied. Please log in first.',
            users: null
        });
    }

    const userId = req.session.userId;

    try {
        const query = 'UPDATE users SET email = $1 WHERE id = $2';
        await db.query(query, [new_email, userId]);

        res.render('home', { 
            session: req.session, 
            csrfMessage: 'Email updated successfully!',
            users: null
        });
    } catch (error) {
        console.error('Error updating email:', error);
        res.status(500).render('home', { 
            session: req.session, 
            csrfMessage: 'Error updating email.',
            users: null
        });
    }
});

module.exports = router;