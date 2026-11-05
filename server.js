require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const path = require('path');

const app = express();

// ── Database ──────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => { console.error('Mongo error:', err); process.exit(1); });

// ── Passport config ───────────────────────────────
require('./config/passport')(passport);

// ── Middleware ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// inject user into every view
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// ── Routes ────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/pages'));
app.use('/api/keys', require('./routes/keys'));
app.use('/admin', require('./routes/admin'));

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404');
});

// ── Start ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ fixo api running at ${process.env.BASE_URL}`);
});
