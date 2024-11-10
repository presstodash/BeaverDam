const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const csurf = require('csurf');
const app = express();
const path = require('path');
const db = require('./db');

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(session({
    store: new pgSession({
        pool: db,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'very-secret-randomly-generated-strong-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'None'
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

const csrfProtection = csurf();

app.use((req, res, next) => {
    if (req.session.userId && req.session.secureMode && req.path !== '/login' && req.path !== '/logout') {
        csrfProtection(req, res, next);
    } else {
        next();
    }
});

app.use((req, res, next) => {
    if (req.session.userId && req.session.secureMode) {
        try {
            res.locals.csrfToken = req.csrfToken();
        } catch (err) {
            res.locals.csrfToken = null;
        }
    } else {
        res.locals.csrfToken = null;
    }
    next();
});


const homeRoute = require('./routes/home');
app.use('/', homeRoute);

/* Secure mode for specifically CSRF */
app.post('/toggle_secure_mode', (req, res) => {
    req.session.secureMode = req.body.secure_mode === 'on';
    res.redirect('/');
});

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('home', {
            users: null,
            session: req.session,
            csrfMessage: 'Invalid CSRF token. Action could not be completed.',
            csrfToken: req.session.secureMode ? req.csrfToken() : null
        });
    }
    next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});