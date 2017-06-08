var express = require('express');
var router = express.Router();
var mongoose = require('mongoose-q')(require('mongoose'));

var passport = require('../../lib/auth');
var helpers = require('../../lib/helpers');
var Product = require('../../models/product');
var Merchant = require('../../models/merchant');

// ** products ** //

// get ALL products
router.get('/products', helpers.ensureAdminJSON,
  function(req, res, next) {
  Product.findQ()
  .then(function(products) {
    res.status(200)
    .json({
      status: 'success',
      data: products,
      message: 'Retrieved products.'
    });
  })
  .catch(function(err) {
    return next(err);
  })
  .done();
});

// get SINGLE product
router.get('/product/:id', helpers.ensureAdminJSON,
  function(req, res, next) {
  Product.findByIdQ(req.params.id)
  .then(function(product) {
    res.status(200)
    .json({
      status: 'success',
      data: product,
      message: 'Retrieved product.'
    });
  })
  .catch(function(err) {
    return next(err);
  })
  .done();
});

// add new product
router.post('/product', helpers.ensureMerchantAuthenticated,
  function(req, res, next) {
  var product = new Product({
    name: req.body.name,
    amount: req.body.amount
  });
  var productData = { productID: product._id};
  var options = {new:true};
  Merchant.findByIdAndUpdateQ(req.user._id, {$push: {menu: productData}}, options)
      .then(function(merchant){
        console.dir("found merchant" + merchant);
      })
      .catch(function(err) {
      return next(err);
  }).done();

  product.saveQ()
  .then(function(result) {
    res.status(200)
    .json({
      status: 'success',
      data: result,
      message: 'Created product.'
    });
  })
  .catch(function(err) {
    res.send(err);
  })
  .done();
});

// update SINGLE product
router.put('/product/:id', helpers.ensureMerchantAuthenticated,
  function(req, res, next) {
  var id = req.params.id;
  var update = req.body;
  var options = {new:true, upsert:true};
  Product.findByIdAndUpdateQ(id, update, options)
  .then(function(result) {
    res.status(200)
    .json({
      status: 'success',
      data: result,
      message: 'Updated product.'
    });
  })
  .catch(function(err) {
    res.send(err);
  })
  .done();
});

// delete SINGLE product
// todo: make sure that it deletes ONLY if it finds it in current merchant's menu...
router.delete('/product/:id', helpers.ensureMerchantAuthenticated,
  function(req, res, next) {
  var productData = { productID: req.params.id};
  var options = {new:true};
  Product.findByIdAndRemoveQ(req.params.id)
  .then(function(product) {
    // find and remove it from merchant menu
      Merchant.findByIdAndUpdate(req.user._id, {$pull: {menu: productData}}, options, function(err, merchant){
        if(err) {
          res.send(err);
        }
        console.dir("found merchant" + merchant);
      });
    res.status(200)
    .json({
      status: 'success',
      data: product,
      message: 'Removed product.'
    });
  })
  .catch(function(err) {
    res.send(err);
  })
  .done();
});


module.exports = router;