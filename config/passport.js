const LocalStrategy = require('passport-local').Strategy;
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
        if (!user.password) return done(null, false, { message: 'Wrong password' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return done(null, false, { message: 'Wrong password' });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

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
