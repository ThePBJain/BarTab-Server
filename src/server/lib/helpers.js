function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}
function ensureMerchantAuthenticated(req, res, next) {
    console.log("Testing Merchant Auth for: " + req.user.email);
    if (req.isAuthenticated() && req.user.description) {
        console.log("Successful test of Merchant Auth");
        return next();
    }
    res.redirect('/merchant/auth/login');
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.admin) {
    return next();
  }
  req.flash('message', {
    status: 'danger',
    value: 'You are not an Admin.'
  });
  res.redirect('/auth/login');
}

function ensureAdminJSON(req, res, next) {
  if (req.isAuthenticated() && req.user.admin) {
    return next();
  }
  res.status(401)
  .json({
    status: 'error',
    message: 'You do not have permission to do that.'
  });
}

function loginRedirect(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    return next();
  }
}


module.exports = {
  ensureMerchantAuthenticated: ensureMerchantAuthenticated,
  ensureAuthenticated: ensureAuthenticated,
  ensureAdmin: ensureAdmin,
  ensureAdminJSON: ensureAdminJSON,
  loginRedirect: loginRedirect
};
