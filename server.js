require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const path = require('path');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');

const app = express();

// ── Trust Proxy (Railway සඳහා අනිවාර්යයි) ──
app.set('trust proxy', 1);

// ── Database Connection ──────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✓ MongoDB connected');
    
    // ── Auto-create or Update Admin User ──
    try {
      const adminEmail = 'onethsara270@gmail.com';
      const adminPassword = 'oshan123#';
      
      const existingAdmin = await User.findOne({ email: adminEmail });
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      if (existingAdmin) {
        // ඉස්සරහට Account එක තියෙනවා නම්, Password එක සහ Role එක අප්ඩේට් කරනවා
        existingAdmin.password = hashedPassword;
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✓ Admin Account Updated!');
      } else {
        // නැත්නම් අලුතෙන් හදනවා
        await User.create({
          email: adminEmail,
          password: hashedPassword,
          name: 'Oshan Admin',
          role: 'admin'
        });
        console.log('✓ Default Admin Account Created!');
      }
    } catch (err) {
      console.error('Admin creation error:', err);
    }
  })
  .catch(err => { 
    console.error('MongoDB connection error:', err); 
    process.exit(1); 
  });

// ── Passport config ───────────────────────────────
require('./config/passport')(passport);

// ── Middleware ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fixo_super_secret_key_12345',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: false, // ⚠️ මේක false කළා (මේක තමයි ප්‍රශ්නෙ හැදුවේ)
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
app.use('/api', require('./routes/api')); 
app.use('/api/keys', require('./routes/keys'));
app.use('/admin', require('./routes/admin'));

app.use('/', require('./routes/pages'));

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404');
});

// ── Start Server ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ fixo api running at ${process.env.BASE_URL || 'http://localhost:' + PORT}`);
});
