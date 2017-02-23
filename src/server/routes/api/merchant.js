var express = require('express');
var router = express.Router();
var mongoose = require('mongoose-q')(require('mongoose'));

var passport = require('../../lib/auth');
var helpers = require('../../lib/helpers');
var Merchant = require('../../models/merchant');


// ** merchants ** //

// get ALL merchants
router.get('/merchants', helpers.ensureAdminJSON,
  function(req, res, next) {
  merchant.findQ()
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
router.get('/merchants/:id', helpers.ensureAdminJSON,
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

// add new product
router.post('/merchants', helpers.ensureAdminJSON,
  function(req, res, next) {
  var merchant = new Merchant({
    'name': req.body.name,
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
// (todo) remove all products in menu for merchant as well
router.delete('/merchants/:id', helpers.ensureAdminJSON,
  function(req, res, next) {
  Merchant.findByIdAndRemoveQ(req.params.id)
  .then(function(merchant) {
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

// (todo) set up tool to have sale on products for period of time

module.exports = router;
