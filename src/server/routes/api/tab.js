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
var redis = require('../../lib/redis');
//(todo) using redis, create, edit and delete tabs
//(todo) set up authentication for each merchant to access redis (NO ONE ELSE)

//commands for redis
/*
(create)
 HMSET tab:MerchantID.UserID userID "<UserID>" merchantID "<MerchantID>" tabTotal <total tab money spent> Products "[{productID: \"product3\", name: \"product3\", time: { type: Date, default: Date.now }}]"

    (add to running list) so its searchable...
    SADD tabs MerchantID.UserID

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
router.post('/open/:id', helpers.ensureAuthenticated,
    function(req, res, next) {
        //var store = new Store({
        //    'name': req.body.name,
        //    'description': req.body.description,
        //});
        var userID = req.user._id.toString();
        var merchantID = req.params.id;
        console.log("OPENING TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);
        var tabKey = "tab:" + merchantID + "." + userID;


        redis.hmset(tabKey, {
                "userID": userID,
                "merchantID": merchantID,
                "tabTotal": 0,
                "numProducts": 0

            }, function(err, reply) {
            // reply is null when the key is missing
                if(reply) {
                    console.log("Successfully opened tab!");
                    res.status(200).send("success");
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
router.post('/update/add/:id', helpers.ensureAuthenticated,
    function(req, res, next) {
        //var store = new Store({
        //    'name': req.body.name,
        //    'description': req.body.description,
        //});
        var userID = req.user._id.toString();
        var merchantID = req.params.id;
        console.log("OPENING TAB WITH USER: " + userID + "\n and MERCHANT: " + merchantID);
        var tabKey = "tab:" + merchantID + "." + userID;


        redis.hmset(tabKey, {
            "userID": userID,
            "merchantID": merchantID,
            "tabTotal": 0,
            "numProducts": 0

        }, function(err, reply) {
            // reply is null when the key is missing
            if(reply) {
                console.log("Successfully opened tab!");
                res.status(200).send("success");
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

/*
keys   for index 0
 Products.0.productID = ProductID
 Products.0.time = Date.now
 */


//get all tabs w/ merchantID

//get TabTotal w/ userID

//find nearby bars (geolocationing)



//(todo) when exiting or deleting tab, make it go through charge paths to charge card

module.exports = router;
