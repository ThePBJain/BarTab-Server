var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;
var SALT_WORK_FACTOR;

if (process.env.NODE_ENV === 'test') {
  SALT_WORK_FACTOR = 1;
} else {
  SALT_WORK_FACTOR = 10;
}

var Merchant = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true
  },
  products: [
    {
      productID: String,
      token: String,
      time: { type: Date, default: Date.now }
    }
  ],
  password: {
    type: String,
    required: true
  },
  admin: {
    type: Boolean,
    default: false
  },
  stripe: {
    type: String,
    unique: true,
    default: "NAN"
  }
});

Merchant.methods.generateHash = function(password, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return next(err);
    }
    bcrypt.hash(password, salt, function(err, hash) {
      if (err) {
        return next(err);
      }
      return callback(err, hash);
    });
  });
};

Merchant.methods.comparePassword = function(password, done) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    if (err) {
      return done(err);
    }
    return done(null, isMatch);
  });
};


module.exports = mongoose.model('merchants', User);
