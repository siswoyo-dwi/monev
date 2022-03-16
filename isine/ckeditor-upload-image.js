var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , path = require('path');
 var cek_login = require('./login').cek_login;
var dbgeo = require("dbgeo");
var multer = require("multer");
var fs = require('fs');
path.join(__dirname, '/foto')

  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.json());
  router.use(cookieParser() );
  router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge : 1200000 },saveUninitialized: true, resave: true }));
  router.use(passport.initialize());
  router.use(passport.session());
  
  var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+'-'+file.originalname)
  }
})

var upload = multer({ storage: storage })


router.post('/', cek_login, upload.single('upload'), function(req, res) {
  res.send({'uploaded': 1, 'fileName': req.file.filename, 'url': 'http://localhost:8800/uploads/'+req.file.filename})
});



module.exports = router