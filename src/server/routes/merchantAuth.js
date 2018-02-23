/**
 * Created by PranavJain on 2/24/17.
 */
var express = require('express');
var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
var router = express.Router();
var moment = require('moment');

var passport = require('../lib/auth');
var helpers = require('../lib/helpers');
var Merchant = require('../models/merchant');
var Product = require('../models/product');

router.get('/register', function(req, res, next){
    res.render('register', {
        merchant: req.user,
        message: req.flash('message')[0]
    });
});


router.post('/register', function(req, res, next) {
    var newMerchant = new Merchant({
        'email': req.body.email
    });

    newMerchant.generateHash(req.body.password, function(err, hash) {
        if (err) {
            return next(err);
        } else {
            newMerchant.password = hash;
            console.log(newMerchant);
            // todo: create stripe merchant in connect here
            //leave a merchant for now
            var date = req.body.dob;//substring then parseInt
            var month = parseInt(date.substring(0, 2));
            var day = parseInt(date.substring(3,5));
            var year = parseInt(date.substring(6, 10));
            stripe.accounts.create({
                email: req.body.email,
                type: "custom",
                country: 'US',
                tos_acceptance: {
                    date: Math.floor(Date.now() / 1000),
                    ip: req.connection.remoteAddress // Assumes you're not using a proxy
                },
                legal_entity: {
                    first_name: req.body.firstName,
                    last_name: req.body.lastName,
                    type: req.body.type,
                    dob: {
                        "day": day,
                        "month": month,
                        "year": year
                    }
                }
            }, function(err, merchant) {
                console.log("Stripe Error: " + err);
                console.log("Stripe merchant: " + merchant);
                console.log("Merchant ID: " + merchant.id);
                newMerchant.stripe = merchant.id;
                console.log(newMerchant);
                //add merchant location here...
                if (req.body.long && req.body.lat) {
                    newMerchant.location = [req.body.long, req.body.lat];
                }
                //save the merchant
                newMerchant.save(function(err, results) {
                    if (err) {
                        console.log(err);
                        req.flash('message', {
                            status: 'danger',
                            value: 'Sorry. That email already exists. Try again.'
                        });
                        return res.redirect('/merchant/auth/register');
                    } else {
                        req.logIn(newMerchant, function(err) {
                            if (err) {
                                return next(err);
                            }
                            req.flash('message', {
                                status: 'success',
                                value: 'Successfully registered (and logged in).'
                            });
                            return res.redirect('/');
                        });
                    }
                });
            });
        }
    });
});

router.get('/login', helpers.loginRedirect, function(req, res, next){
    res.render('login', {
        merchant: req.user,
        message: req.flash('message')[0]
    });
});

router.post('/login', function(req, res, next) {
    passport.authenticate('merchant-local', function(err, merchant, info) {
        if (err) {
            return next(err);
        }
        if (!merchant) {
            req.flash('message', {
                status: 'danger',
                value: 'Invalid username and/or password.'
            });
            return res.redirect('/merchant/auth/login');
        }
        req.logIn(merchant, function(err) {
            if (err) {
                return next(err);
            }
            req.flash('message', {
                status: 'success',
                value: 'Welcome!'
            });
            return res.redirect('/');
        });
    })(req, res, next);
});

router.get('/logout', helpers.ensureMerchantAuthenticated, function(req, res){
    req.logout();
    req.flash('message', {
        status: 'success',
        value: 'Successfully logged out.'
    });
    res.redirect('/');
});

router.get('/profile', helpers.ensureMerchantAuthenticated, function(req, res){
    res.render('profile', {
        merchant: req.user,
        message: req.flash('message')[0]
    });
});

router.get('/admin', helpers.ensureMerchantAuthenticated, function(req, res){
    return Merchant.findById(req.user._id, function(err, data) {
        if (err) {
            return next(err);
        } else {
            var sales = [];
            if(data.sales){
                for (var j = 0; j < data.sales.length; j++) {
                    sales.push(data.sales[j]);
                }
            }
            console.log("opening admin page");
            if (data.menu) {
                var ids = [];
                for(var i = 0; i < data.menu.length; i++){
                    ids.push(data.menu[i].productID);
                }
                console.log(ids.toString());
                Product.find({ '_id': { $in: ids }}, function(err, data) {
                    console.log(data);
                    return res.render('admin', {menu: data, data: sales, moment: moment, merchant: req.user});
                });


            }else {
                return res.render('admin', {menu: [], data: sales, moment: moment, merchant: req.user});
            }
        }
    });
});

router.post('/update', function(req, res, next) {

    Merchant.findById(req.user._id, function(err, merchant) {
        //format is m/d/YYY
        var bdays = req.body.dob.split("/");
        if (err) {
            return next(err);
        } else {
            console.log(req.body.dob);
            stripe.accounts.update(merchant.stripe,
            {
                legal_entity: {
                    first_name: req.body.firstName,
                    last_name: req.body.lastName,
                    type: req.body.type,
                    dob: {
                        "day": bdays[1],
                        "month": bdays[0],
                        "year": bdays[2]
                    }
                }
            }, function(err, reply) {
                console.log(err);
                console.log(reply);
                //todo: save the merchant for when we eventually update it with names and shit
                    /*
                merchant.save(function(err, results) {
                    if (err) {
                        console.log(err);
                        req.flash('message', {
                            status: 'danger',
                            value: 'Sorry. That email already exists. Try again.'
                        });
                        return res.redirect('/merchant/auth/register');
                    } else {
                        req.flash('message', {
                            status: 'success',
                            value: 'Sucessfully updated stripe.'
                        });
                        return res.redirect('/');

                    }
                });
                */
                    req.flash('message', {
                        status: 'success',
                        value: 'Sucessfully updated stripe.'
                    });
                    return res.redirect('/');
            });
        }
    });
});


module.exports = router;

