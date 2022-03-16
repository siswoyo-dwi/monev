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
  var gdal = require("gdal");
      var Parser = require('node-dbf');
      var deasync = require('deasync');
path.join(__dirname, '/foto')

  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.json());
  router.use(cookieParser() );
  router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge : 1200000 },saveUninitialized: true, resave: true }));
  router.use(passport.initialize());
  router.use(passport.session());
  
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'shp/')
  },
  filename: function (req, file, cb) {
    var nama_file = file.originalname.substr(file.originalname.length - 4);
    nama_file = "datane"+nama_file;
    cb(null, nama_file)
  }
})
var upload = multer({ storage: storage })
//ambil data shp----------------------------------
// var datanya= [];
// var parser = new Parser("shp/daerah_irigasi.dbf");

// parser.on('start', function(p) {
//     console.log('dBase file parsing has started');
// });

// parser.on('header', function(h) {
//     console.log('dBase file header has been parsed');
// });

// parser.on('record', function(record) {
//  // console.log(JSON.stringify(record))
//     datanya.push(JSON.stringify(record));
// });
//  var data_geometry = [];
// parser.on('end', function(p) {
//   var dataset = gdal.open("shp/daerah_irigasi.shp");
 
//   dataset.layers.get(0).features.forEach(function(feature, index) {
//     data_geometry.push(JSON.stringify(feature.getGeometry().toWKT()))
//     // console.log(feature.getGeometry().toWKT());
//    //  console.log(datanya[index])
//   });

//   //  console.log('Finished parsing the dBase file');
// });
//ambil data shp----------------------------------



router.get('/', cek_login, function(req, res) {

  res.render('upload_form_shp');
});
var cpUpload = upload.fields([{ name: 'shp', maxCount: 1 }, { name: 'shx', maxCount: 1 }, { name: 'dbf', maxCount: 1 }])
  router.post('/shp', cpUpload, function(req, res){
   
    //dbf


   // parser.parse();
     //shp
     var data_geometry = [];
      var dataset = gdal.open("shp/datane.shp");
      
       dataset.layers.get(0).features.forEach(function(feature, index) {
         data_geometry.push(feature.getGeometry().toWKT())
         // console.log(feature.getGeometry().toWKT());
        //  console.log(datanya[index])
       });
       res.json(data_geometry[0])
  
   // res.sendStatus(200)
})

   
module.exports = router;
