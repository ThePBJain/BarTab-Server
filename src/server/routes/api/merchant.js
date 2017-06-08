var express = require('express');
var router = express.Router();
var mongoose = require('mongoose-q')(require('mongoose'));

var passport = require('../../lib/auth');
var helpers = require('../../lib/helpers');
var Merchant = require('../../models/merchant');
var Product = require('../../models/product');


// ** merchants ** //

// get ALL merchants
router.get('/merchants', helpers.ensureAdminJSON,
    function(req, res, next) {
        Merchant.findQ()
            .then(function(merchants) {
                res.status(200)
                    .json({
                        status: 'success',
                        data: merchants,
                        message: 'Retrieved merchants.'
                    });
            })
            .catch(function(err) {
                return next(err);
            })
            .done();
    });

// get SINGLE merchant
router.get('/merchant/:id', helpers.ensureAdminJSON,
    function(req, res, next) {
        Merchant.findByIdQ(req.params.id)
            .then(function(merchant) {
                res.status(200)
                    .json({
                        status: 'success',
                        data: merchant,
                        message: 'Retrieved merchant.'
                    });
            })
            .catch(function(err) {
                return next(err);
            })
            .done();
    });

// add new merchant
router.post('/merchants', helpers.ensureMerchantAuthenticated,
    function(req, res, next) {
        var merchant = new Merchant({
            'email': req.body.email,
            'description': req.body.description
        });
        merchant.saveQ()
            .then(function(result) {
                res.status(200)
                    .json({
                        status: 'success',
                        data: result,
                        message: 'Created merchant.'
                    });
            })
            .catch(function(err) {
                return next(err);
            })
            .done();
    });

// update single merchant
router.put('/merchants/:id', helpers.ensureAdminJSON,
    function(req, res, next) {
        var id = req.params.id;
        var update = req.body;
        var options = {new:true, upsert:true};
        Merchant.findByIdAndUpdateQ(id, update, options)
            .then(function(result) {
                res.status(200)
                    .json({
                        status: 'success',
                        data: result,
                        message: 'Updated merchant.'
                    });
            })
            .catch(function(err) {
                return next(err);
            })
            .done();
    });

// delete SINGLE merchant
router.delete('/merchants/:id', helpers.ensureAdminJSON,
    function(req, res, next) {
        Merchant.findByIdAndRemoveQ(req.params.id)
            .then(function(merchant) {
                merchant.menu.forEach(function(value){
                    Product.findByIDAndRemoveQ(value.productID)
                        .then(function(product) {
                            console.log("Removed Product: " + product.name);
                        })
                        .catch(function(err) {
                            res.send(err);
                        })
                        .done();
                });
                res.status(200)
                    .json({
                        status: 'success',
                        data: merchant,
                        message: 'Removed merchant.'
                    });
            })
            .then(function(err) {
                return next(err);
            })
            .done();
    });

//get value from query localhost.com/api/v1/merchants/nearby?long=<longitude value>&lat=<latitude value>
router.get('/merchants/nearby', passport.authenticate('user-mobile', { session: false }),
    function(req, res, next) {

        var longitude = Number(req.query.long);
        var latitude = Number(req.query.lat);

        var point = { type : "Point", coordinates : [longitude, latitude] };
        //maxDistance in meters? and returns max 5 values.
        var options = {
            maxDistance : 10,
            limit: 5,
            spherical : true
        };
        //options.query = { password: 0, stripe: 0, admin: 0, menu: 0, sales: 0};
        Merchant.geoNear(point, options, function(err, results, stats) {
            if(err){
                return next(err);
            }else {
                //todo: get rid of sensitive information
                for(var i=0;i<results.length;i++){
                    console.log(results[i].obj);
                    console.log("The password is: " + results[i].obj.password);
                    delete results[i].obj.password;
                    delete results[i].obj.stripe;
                    delete results[i].obj.admin;
                    delete results[i].obj.menu;
                    delete results[i].obj.sales;
                }
                console.log(results);
                res.status(200)
                    .json({
                        status: 'success',
                        data: results,
                        message: 'Retrieved nearby merchants.'
                    });
            }
        });

    });

// (todo) set up tool to have sale on products for period of time

module.exports = router;
