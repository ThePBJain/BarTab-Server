/**
 * Created by PranavJain on 2/20/17.
 */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose-q')(require('mongoose'));

var passport = require('../../lib/auth');
var helpers = require('../../lib/helpers');
var User = require('../../models/user');
var Merchant = require('../../models/merchant');
var Product = require('../../models/product.js');
var redis = require('../../lib/redis');
var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// using redis, create, edit and delete tabs
//(todo) set up authentication for each merchant to access redis (NO ONE ELSE)

//commands for redis
/*
(create)
 HMSET tab:MerchantID.UserID userID "<UserID>" merchantID "<MerchantID>" tabTotal <total tab money spent> Products "[{productID: \"product3\", name: \"product3\", time: { type: Date, default: Date.now }}]"

    (add to running list) so its searchable...
    SADD tabs:MerchantID MerchantID.UserID

 (get)
 HMGET tab:MerchantID.UserID tabTotal merchantID Products etc.

(search for tabs that are associated with a merchant)
 SSCAN tabs 0 MATCH MerchantID*

 (delete)
  DEL tab:MerchantID.UserID
    (delete from running list) so its no longer searched...
    SREM users "MerchantID.UserID"

    tabs: {
        MerchantID : {
            userID1 : {
                userID: "",
                merchantID: "",
                tabTotal: 0,
                numProducts: 0,
                Products: [
                    {
                        productID: "",
                        name: "",
                        time: "Date.now"
                    },
                    {
                        productID: "",
                        name: "",
                        time: "Date.now"
                    }
                ]
            },
            userID2 : {
                userID: "",
                merchantID: "",
                tabTotal: 0,
                numProducts 0,
                Products: [
                    {
                        productID: "",
                        name: "",
                        time: "Date.now"
                    },
                    {
                        productID: "",
                        name: "",
                        time: "Date.now"
                    }
                ]
            }
        }
    }





 */

//Todo: set up failsafes for all methods!!!!

//authorization functions
const requireAuth = passport.authenticate('user-mobile', { session: false });
//all functions with "requireAuth" used to have helpers.ensureAuthenticated

//open Tab localhost:3000/tabs/open/:id <- id is for Merchant
router.post('/open', requireAuth,
    function(req, res, next) {
        //var store = new Store({
        //    'name': req.body.name,
        //    'description': req.body.description,
        //});
        var userID = req.user._id.toString();
        var merchantID = req.body.id;
        console.log("OPENING TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);
        var tabKey = "tab:" + merchantID + "." + userID;

        //todo: if redis.exists(tabkey) then throw danger error.
        //could mean that they are trying to override their currently open tab...
        //redis.hget(tabKey, "numProducts", function (err, reply) {
        redis.hgetall(tabKey, function (err, obj) {
            if(err){
                res.status(500)
                    .json({
                        status: 'error',
                        data: err,
                        message: 'Something went wrong'
                    });
            }else {
                console.log("This is what we found when checking if tab is already open");
                console.dir(obj);
                if (obj) {
                    res.status(200)
                        .json({
                            status: 'success',
                            data: obj,
                            message: 'Retrieved tab.'
                        });
                }else{
                    redis.hmset(tabKey, {
                        "userID": userID,
                        "merchantID": merchantID,
                        "tabTotal": 0.0,
                        "numProducts": 0

                    }, function(err, reply) {
                        // reply is null when the key is missing
                        if(err){
                            return next(err);
                        }else {
                            console.log("Successfully opened tab!");
                            res.status(200)
                                .json({
                                    status: 'success',
                                    data: reply,
                                    message: 'Created tab.'
                                });
                            //test output
                            redis.hgetall(tabKey, function (err, obj) {
                                console.dir(obj);
                            });
                        }
                    });
                }
            }
        });


        var tabsMember = merchantID + "." + userID;
        var merchantTabs = "tabs:" + merchantID;
        redis.sadd(merchantTabs, tabsMember, function(err, reply) {
            if(reply){
                console.log("Successfully added tabID to set.");
            }
        });

        //test output
        redis.smembers(merchantTabs, function(err, reply) {
            console.log(reply);
        });

    });

//close tab

//update tab add and remove product

/*
 tabs.MerchantID.userID1.Products.0.productID: ""
 tabs.MerchantID.userID1.Products.0.time: "Date.now"
 tabs.MerchantID.userID1.Products.1.productID: ""
 tabs.MerchantID.userID1.Products.1.time: "Date.now"
 */
//add item to tab
router.post('/update/add', helpers.ensureMerchantAuthenticated,
    function(req, res, next) {
        //var store = new Store({
        //    'name': req.body.name,
        //    'description': req.body.description,
        //});
        var merchantID = req.user._id.toString();
        var userID = req.body.id;
        var productID = req.body.productID;
        //safeguard
        if(!userID || !productID){
            req.flash('message', {
                status: 'danger',
                value: 'Mistakes were made.'
            });
            return res.redirect('/merchant/auth/profile');
        }

        console.log("ADDING PRODUCT: " + productID + "\n TO TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);
        var tabKey = "tab:" + merchantID + "." + userID;


        redis.hget(tabKey, "numProducts", function (err, reply) {
            if(err){
                console.log(err);
            }
            if(!reply){
                console.dir(reply);
                res.status(400)
                    .json({
                        status: 'err',
                        data: err,
                        message: 'Failed to find tab.'
                    });
                return next(err);
            }
            var numProducts = parseInt(reply.toString());
            var productIDKey = "Products." + numProducts + ".productID";
            var productTimeKey = "Products." + numProducts + ".time";
            var cost = 0.0;
            var obj = {};
            var date = new Date();
            obj[productIDKey] = productID;
            obj[productTimeKey] = date.toISOString();
            //figure how to use q to do this better...
            Product.findById(productID, function(err, product) {
                if (err) {
                    return next(err);
                } else {
                    cost = product.amount;
                    //all the redis commands need to go into here.
                    redis.multi().
                    hincrby(tabKey, "numProducts", 1).
                    HINCRBYFLOAT(tabKey, "tabTotal", cost).
                    hmset(tabKey, obj).exec(
                        function(err, reply) {
                            // reply is null when the key is missing
                            if(err){
                                return next(err);
                            }else{
                                console.log("Successfully added to tab!");
                                //test output
                                redis.hgetall(tabKey, function (err, obj) {
                                    console.dir(obj);
                                    res.status(200)
                                        .json({
                                            status: 'success',
                                            data: obj,
                                            message: 'Retrieved tab.'
                                        });
                                });
                            }
                        });
                }
            });

        });


    });

//remove item from tab
router.post('/update/remove', helpers.ensureMerchantAuthenticated,
    function(req, res, next) {

        var merchantID = req.user._id.toString();
        var userID = req.body.id;

        //this is the index number of the item we would like to remove from the tab
        var itemNum = req.body.itemNum;

        console.log("Removing PRODUCT in index: " + itemNum + "\n IN TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);

        var tabKey = "tab:" + merchantID + "." + userID;
        var productIDKey = "Products." + itemNum + ".productID";
        var productTimeKey = "Products." + itemNum + ".time";
        redis.hget(tabKey, productIDKey, function (err, reply) {
            var productID = reply;
            var cost = 0.0;
            //figure how to use q to do this better...
            Product.findById(productID, function(err, product) {
                if (err) {
                    return next(err);
                } else {
                    cost = -1*product.amount;
                    //decrement numproducts and tab total. get get rid of it from list.
                    redis.multi().
                    hincrby(tabKey, "numProducts", -1).
                    HINCRBYFLOAT(tabKey, "tabTotal", cost).
                    hdel(tabKey, productIDKey, productTimeKey)
                        .exec(function(err, reply) {
                            // reply is null when the key is missing
                            if(err){
                                return next(err);
                            }else {
                                console.log("Successfully removed from tab!");
                                //test output
                                redis.hgetall(tabKey, function (err, obj) {
                                    console.dir(obj);
                                    res.status(200)
                                        .json({
                                            status: 'success',
                                            data: obj,
                                            message: 'Retrieved tab.'
                                        });
                                });
                            }
                        });
                }
            });

        });


    });

/*
keys   for index 0
 Products.0.productID = ProductID
 Products.0.time = Date.now
 */


//get all tabs w/ merchantID
//what information should we return?
router.post('/getall', helpers.ensureMerchantAuthenticated,
    function(req, res, next) {

        var merchantID = req.user._id.toString();

        //this is the index number of the item we would like to remove from the tab

        console.log("Getting all tabs for MERCHANT: " + merchantID);

        var tabsKey = "tabs:" + merchantID;
        redis.smembers(tabsKey, function (err, reply) {
            if(err){
                return next(err);
            }
            else {
                var allTabs = reply;
                console.log("All tabs: " + allTabs);
                res.status(200)
                    .json({
                        status: 'success',
                        data: allTabs,
                        message: 'Retrieved all tabs from merchant.'
                    });
            }
        });


    });


//get tab info for user w/ userID like tabTotal and products bought
//passing in merchantID for this specific user
router.get('/tab/:id', requireAuth,
    function(req, res, next) {

        var userID = req.user._id.toString();
        var merchantID = req.params.id;
        //this is the index number of the item we would like to remove from the tab

        var tabKey = "tab:" + merchantID + "." + userID;
        //test output
        redis.hgetall(tabKey, function (err, obj) {
            if(err){
                return next(err);
            }else {
                console.dir(obj);
                res.status(200)
                    .json({
                        status: 'success',
                        data: obj,
                        message: 'Retrieved tab.'
                    });
            }
        });


    });

//get User for merchant to populate information on bartender dashboard
//passing in userID
router.get('/user/:id', helpers.ensureMerchantAuthenticated,
    function(req, res, next) {

        var merchantID = req.user._id.toString();
        var userID = req.params.id;
        //this is the index number of the item we would like to remove from the tab

        var tabKey = "tab:" + merchantID + "." + userID;
        //test output
        redis.hgetall(tabKey, function (err, obj) {
            if(err){
                return next(err);
            }else {
                console.dir(obj);
                res.status(200)
                    .json({
                        status: 'success',
                        data: obj,
                        message: 'Retrieved tab.'
                    });
            }
        });


    });




//(todo) when exiting or deleting tab, make it go through charge paths to charge card
//todo: allow function to close tabs even when there is no bill i.e tabTotal = 0
//close tab
router.post('/close', requireAuth,
    function(req, res, next) {
        //var store = new Store({
        //    'name': req.body.name,
        //    'description': req.body.description,
        //});
        var userID = req.user._id.toString();
        var merchantID = req.body.id;
        console.log("CLOSING TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);


        var tabKey = "tab:" + merchantID + "." + userID;

        redis.hgetall(tabKey, function (err, tab) {
            if(err || !tab){
                return next(err);
            }else {
                console.dir(tab);
                var cost = Number(tab.tabTotal); //total payment required
                //todo: get currency to work with different types
                var numProducts = parseInt(tab.numProducts);
                //get all products in array
                var productIds = [];
                var productTimes = [];
                for(var i=0; i < numProducts; i++){
                    var productIDKey = "Products." + i + ".productID";
                    var productTimeKey = "Products." + i + ".time";
                    console.log("For Key: " + productIDKey + ", we got: " + tab[productIDKey]);
                    productIds.push(tab[productIDKey]);
                    productTimes.push(new Date(tab[productTimeKey]));
                }
                console.log("Arrays look like: " + productIds.toString() + " and " + productTimes.toString());
                //let charge go through
                User.findById(userID, function(err, user) {
                    if (err) {
                        return next(err);
                    } else {
                        //get rid of this cuz no need for users to have this data
                        user.products.push({
                            productID: req.body.productID,
                            name: "allDaProducts",
                            token: "PreviouSource"
                        });
                        user.save();

                        //if tabTotal = 0 then charge will fail so might as well delete tab from redis
                        if (cost == 0 && (productIds.length < 1)) {
                            console.log("Tab cost is 0... soooo");
                            //delete tab from redis
                            var tabsMember = merchantID + "." + userID;
                            var merchantTabs = "tabs:" + merchantID;
                            redis.multi().del(tabKey).srem(merchantTabs, tabsMember).exec(function (err, reply) {
                                if (err) {
                                    console.log(err);
                                    res.status(500)
                                        .json({
                                            status: 'error',
                                            data: err,
                                            message: 'failed to delete tab'
                                        });
                                } else {
                                    console.log("Deleted Key from redis!");
                                    res.status(200)
                                        .json({
                                            status: 'success',
                                            data: reply,
                                            message: 'Closed Tab.'
                                        });
                                }
                            });
                        } else {

                            Merchant.findById(merchantID, function(err, merch) {
                                if (err) {
                                    console.log(err);
                                    res.status(500)
                                        .json({
                                            status: 'error',
                                            data: err,
                                            message: 'failure in finding Merchant'
                                        });
                                    return next(err);
                                } else {
                                    // Create Charge
                                    console.log("GOT MERCHANT: " + merch);
                                    console.log("TEST-CHARGE: " + Math.round(cost * 100.0));
                                    var amountCharged = Math.round(cost * 100.0);
                                    var charge = {
                                        amount: amountCharged,
                                        currency: 'USD',
                                        customer: user.stripe,
                                        description: "Tab bought with stored card number"
                                    };
                                    if (merch.stripe != "NAN") {
                                        charge["destination"] = {
                                            amount: Math.round(amountCharged * 0.9),
                                            account: merch.stripe
                                        }
                                    }
                                    stripe.charges.create(charge, function (err, charge) {
                                        if (err) {
                                            console.log(err);
                                            res.status(500)
                                                .json({
                                                    status: 'error',
                                                    data: err,
                                                    message: 'failed to send payment for tab'
                                                });
                                            //return next(err);
                                        } else {
                                            res.status(200)
                                                .json({
                                                    status: 'success',
                                                    data: charge,
                                                    message: 'Closed Tab.'
                                                });
                                            console.log("Successfully made a purchase with stored card on a TAB!");
                                            //will stuff still happen?
                                            //get and push new Product data to merchant...
                                            console.log("attempting sales input");
                                            Product.find({'_id': {$in: productIds}}, {name: 1, amount: 1}, function (err, data) {
                                                if (!err) {
                                                    console.log(data);
                                                    //now put it into merchant
                                                    var productData = [];
                                                    for (var i = 0; i < numProducts; i++) {
                                                        //find repeats... see if you can get rid of this so it runs faster than O(n*m) time...
                                                        //could get rid of it if mongo auto returns json instead of array...
                                                        var productName = "";
                                                        var productAmount = 0.0;
                                                        for (var j = 0; j < data.length; j++) {
                                                            if (productIds[i] == data[j]._id) {
                                                                productName = data[j].name;
                                                                productAmount = data[j].amount;
                                                            }
                                                        }
                                                        var obj = {
                                                            productID: productIds[i],
                                                            name: productName,
                                                            token: "Tabs4Life",
                                                            price: productAmount,
                                                            time: productTimes[i]
                                                        };
                                                        productData.push(obj);
                                                    }
                                                    var options = {new: true};
                                                    Merchant.findByIdAndUpdate(merchantID, {$push: {sales: {$each: productData}}}, options, function (err, merchant) {
                                                        if (err) {
                                                            console.log(err);
                                                        }
                                                        console.log("Updated Merchant: " + merchant);
                                                    });
                                                } else {
                                                    console.log(err);
                                                }
                                            });
                                            //delete tab from redis
                                            var tabsMember = merchantID + "." + userID;
                                            var merchantTabs = "tabs:" + merchantID;
                                            redis.multi().del(tabKey).srem(merchantTabs, tabsMember).exec(function (err, reply) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    console.log("Deleted Key from redis!");

                                                }
                                            });

                                        }
                                    });
                                }
                            });

                        }
                    }
                });
            }
        });


    });

module.exports = router;
