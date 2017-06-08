var passport = require('passport');
var LocalStrategy = require('passport-local');
//var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
//const BasicStrategy = require('passport-http').BasicStrategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

var User = require('../models/user');
var Merchant = require('../models/merchant');

// http://stackoverflow.com/a/21898892
//todo: get this to work with OAuth 2 check passportjs docs

passport.use('user-local', new LocalStrategy({
        usernameField: 'email',
        passReqToCallback: true
    },
    function(req, email, password, done) {
        User.findOne({ email: email }, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            user.comparePassword(password, function(err, isMatch) {
                if (err) {
                    return done(err);
                }
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        });
    })
);
passport.use('user-mobile', new JwtStrategy({
        // Telling Passport to check authorization headers for JWT
        jwtFromRequest: ExtractJwt.fromAuthHeader(),
        // Telling Passport where to find the secret
        secretOrKey: process.env.SECRET
    },
    function(payload, done) {
        //console.log("Testing User-Mobile auth flow:  \nPayload: " + JSON.stringify(payload));
        User.findOne({ email: payload.email }, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }else{

                return done(null, user);
            }
        });
    }
));
passport.use('merchant-local', new LocalStrategy({
        usernameField: 'email',
        passReqToCallback: true
    },
    function(req, email, password, done) {
        Merchant.findOne({ email: email }, function(err, merchant) {
            if (err) {
                return done(err);
            }
            if (!merchant) {
                return done(null, false);
            }
            merchant.comparePassword(password, function(err, isMatch) {
                if (err) {
                    return done(err);
                }
                if (isMatch) {
                    return done(null, merchant);
                } else {
                    return done(null, false);
                }
            });
        });
    })
);


//fix these to work with both models
passport.serializeUser(function(user, done) {
    var key = {
        id: user.id,
        type: user.userType
    };
    done(null, key);
});

passport.deserializeUser(function(key, done) {
    //will this even work?
    var Model = key.type === 'User' ? User : Merchant;
    Model.findById(key.id, function(err, user) {
        if (!err) {
            done(null, user);
        } else {
            done(err, null);
        }
    });
});

module.exports = passport;