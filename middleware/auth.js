exports.requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
};

exports.requireAdmin = (req, res, next) => {
  // Return 404 for non-admins so the route is hidden
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(404).render('404');
  }
  next();
};