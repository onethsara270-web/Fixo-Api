const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = (passport) => {
  // ── Local (email + password) ─────────────────────
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return done(null, false, { message: 'No account with that email' });
        if (!user.password) return done(null, false, { message: 'Use Google login for this account' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return done(null, false, { message: 'Wrong password' });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // ── Google OAuth ─────────────────────────────────
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // check if email already registered locally
        const email = profile.emails[0].value.toLowerCase();
        user = await User.findOne({ email });

        if (user) {
          user.googleId = profile.id;
          user.avatar = user.avatar || profile.photos[0]?.value;
          await user.save();
        } else {
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos[0]?.value,
            role: (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).includes(email) ? 'admin' : 'user'
          });
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // ── Session serialization ────────────────────────
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};