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
//(todo) using redis, create, edit and delete tabs
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

//open Tab localhost:8080/tabs/open/:id <- id is for Merchant
router.post('/open', helpers.ensureAuthenticated,
    function(req, res, next) {
        //var store = new Store({
        //    'name': req.body.name,
        //    'description': req.body.description,
        //});
        var userID = req.user._id.toString();
        var merchantID = req.body.id;
        console.log("OPENING TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);
        var tabKey = "tab:" + merchantID + "." + userID;


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
                            message: 'Retrieved tab.'
                        });
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
        redis.hgetall(tabKey, function (err, obj) {
            console.dir(obj);
        });
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

        console.log("ADDING PRODUCT: " + productID + "\n TO TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);
        var tabKey = "tab:" + merchantID + "." + userID;


        redis.hget(tabKey, "numProducts", function (err, reply) {
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
router.get('/tab/:id', helpers.ensureAuthenticated,
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

//find nearby bars (geolocationing)



//(todo) when exiting or deleting tab, make it go through charge paths to charge card

module.exports = router;
