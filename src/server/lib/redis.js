/**
 * Created by PranavJain on 2/22/17.
 */

var redis = require('redis').createClient('6379', 'redis');

/*
 By default, redis.createClient() will use 127.0.0.1 and 6379 as the hostname and port respectively.
 If you have a different host/port you can supply them as following:

 var client = redis.createClient(port, host);

 Now, you can perform some action once a connection has been established. Basically, you just need to listen for connect events as shown below.

 client.on('connect', function() {
 console.log('connected');
 });

 var client = redis.createClient(port, 'hostname', {no_ready_check: true});
 client.auth('password', function (err) {
 if (err) throw err;
 });

 client.on('connect', function() {
 console.log('Connected to Redis');
 });
 */

//connect
redis.on('connect', function() {
    console.log('Connected to Redis');
});
module.exports = redis;
