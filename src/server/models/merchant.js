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
    sales: [
        {
            productID: String,
            name: String,
            token: String,
            price: Number,
            time: { type: Date, default: Date.now }
        }
    ],
    menu: [
        {
            productID: String
        }
    ],
    password: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        default: 'Merchant'
    },
    admin: {
        type: Boolean,
        default: false
    },
    stripe: {
        type: String,  //(todo) connect to Merchant bank account
        unique: true,
        default: "NAN"
    },
    description: {
        type: String,
        required: true,
        default: "A cool bar!"
    },
    location: {
        type: [Number],     // [<longitude>, <latitude>]
        index: '2dsphere'   // create the geospatial index
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


module.exports = mongoose.model('merchants', Merchant);
