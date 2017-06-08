var express = require('express');
var router = express.Router();
var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

var helpers = require('../lib/helpers');
var User = require('../models/user.js');
var Product = require('../models/product.js');
var Merchant = require('../models/merchant.js');


router.get('/products', function(req, res, next){
    return Product.find({}, function(err, data) {
        if (err) {
            return next(err);
        } else {
            return res.render('products', {products: data, user: req.user});
        }
    });
});

router.get('/product/:id', function(req, res, next) {
    var productID = req.params.id;
    Product.findById(productID, function(err, data) {
        if(err) {
            return next(err);
        } else {
            if(!req.user) {
                req.flash('message', {
                    status: 'danger',
                    value: 'Please log in to Purchase!'
                });
            }
            return res.render('product', {
                product: data,
                user: req.user,
                message: req.flash('message')[0]
            });
        }
    });
});

router.get('/charge/:id', helpers.ensureAuthenticated, function(req, res, next) {
    var productID = req.params.id;
    return Product.findById(productID, function(err, data) {
        if (err) {
            return next(err);
        } else {
            return res.render('charge', {product: data, user: req.user});
        }
    });
});

router.get('/stripe', function(req, res, next) {
    res.send("Scram!");
});

//successfully processes card payments with stored card number.
router.post('/source', helpers.ensureAuthenticated, function(req, res, next) {

    var userID = req.user._id;
    // Simple validation
    /*
     Code is supposed to add new card to customer & set to default
     but it doesn't check if a card even exists
     */
    Product.findById(req.body.productID, function(err, data) {
        if (err) {
            return next(err);
        } else {
            if (Number(req.body.productAmount) != data.amount) {
                console.log("SENT TO US: " + req.body.productAmount + "\n What we have stored: " + data.amount);

                req.flash('message', {
                    status: 'danger',
                    value: 'Error!'
                });
                return res.redirect('/');
            } else {
                // Get product details
                var productName = data.name;
                User.findById(userID, function(err, data) {
                    if (err) {
                        return next(err);
                    } else {
                        data.products.push({ productID: req.body.productID, name: productName, token: "PreviouSource" });
                        data.save();
                        // Create Charge
                        var charge = {
                            amount: Number(req.body.productAmount)*100,
                            currency: 'USD',
                            customer: data.stripe,
                            description: "Made using stored card number"
                        };
                        stripe.charges.create(charge, function(err, charge) {
                            if(err) {
                                return next(err);
                            } else {
                                req.flash('message', {
                                    status: 'success',
                                    value: 'Thanks for purchasing a '+req.body.productName+'!'
                                });
                                console.log("Successfully made a purchase with stored card");
                                res.redirect('auth/profile');
                            }
                        });

                    }
                });

            }
        }
    });
});

//create and edit merchant stripe data... add bank accounts, transfer sale data, build on top of things...

//products are under merchant, need to build the setup to make so that we know how many items sold, and when.

//send stripe data

router.post('/stripe', helpers.ensureAuthenticated, function(req, res, next) {
    // Obtain StripeToken
    var stripeToken = req.body.stripeToken;
    var userID = req.user._id;
    // Simple validation
    /*
     Code is supposed to add new card to customer & set to default
     but it doesn't check if card already exists, doesn't check if it has a default card already, etc...
     */
    Product.findById(req.body.productID, function(err, data) {
        if (err) {
            return next(err);
        } else {
            if (Number(req.body.productAmount) !== data.amount) {
                req.flash('message', {
                    status: 'danger',
                    value: 'Error!'
                });
                return res.redirect('/');
            } else {
                // Get product details
                var productName = data.name;
                User.findById(userID, function(err, data) {
                    if (err) {
                        return next(err);
                    } else {
                        data.products.push({ productID: req.body.productID, name: productName, token: stripeToken });
                        data.save();
                        //Push new card to customer object
                        stripe.customers.createSource(
                            data.stripe,
                            {source: stripeToken},
                            function(err, card) {
                                // asynchronously called
                                if(err){
                                    console.log("Error: " + err);
                                }else{
                                    console.log("Successfully added new card to user");
                                    //make new card default
                                    stripe.customers.update(data.stripe, {
                                        default_source: card.id
                                    }, function(err, customer) {
                                        // asynchronously called
                                        if(err){
                                            console.log("Error: " + err);
                                        }else{
                                            console.log("Successfully made card default");
                                            // Create Charge
                                            var charge = {
                                                amount: Number(req.body.productAmount)*100.0,
                                                currency: 'USD',
                                                customer: customer.id,
                                                description: "Made with new card for user"
                                            };
                                            stripe.charges.create(charge, function(err, charge) {
                                                if(err) {
                                                    return next(err);
                                                } else {
                                                    req.flash('message', {
                                                        status: 'success',
                                                        value: 'Thanks for purchasing a '+req.body.productName+'!'
                                                    });
                                                    res.redirect('auth/profile');
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        );
                    }
                });
            }
        }
    });
});


module.exports = router;
