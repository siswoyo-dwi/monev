var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , path = require('path')
  ,  sha1 = require('sha1');

 var cek_login = require('./login').cek_login;
var dbgeo = require("dbgeo");
var multer = require("multer");

path.join(__dirname, '/foto')
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  router.use(cookieParser() );
  router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge : 1200000 },saveUninitialized: true, resave: true }));
  router.use(passport.initialize());
  router.use(passport.session());
  router.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'foto/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+'-'+file.originalname)
  }
})

var upload = multer({ storage: storage })

//start-------------------------------------
router.get('/', function(req, res) {
      connection.query("SELECT * from user where deleted=0 ", function(err, rows, fields) {
          if (err) throw err;
          numRows = rows.length;
          console.log(rows);
           res.render('content-backoffice/user/list',{data : rows});
        })
 
});

router.get('/insert', cek_login, function(req, res) {
    res.render('content-backoffice/user/insert');

       


});

router.get('/edit/:id', cek_login, function(req, res) {
  connection.query("select * from user where id_user='"+req.params.id+"'", function(err, rows, fields) {
    if (err) throw err;
     res.render('content-backoffice/user/edit', {data : rows});
    
  })


});

router.get('/delete/:id', cek_login, function(req, res) {
  
  // senjata
  // console.log(req.params.id)
  connection.query("update user SET deleted=1 WHERE id_user='"+req.params.id+"' ", function(err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/user');
});



router.post('/submit_insert', upload.array(), function(req, res){

  // baca name-namenya dari form
  // req.body.nameopo

  // senjata
  console.log(req.body)
  connection.query("insert into user (username, pwd, fullname, NIP, email, telp, is_admin) VALUES ('"+req.body.username+"', '"+sha1(req.body.pwd)+"', '"+req.body.fullname+"', '"+req.body.NIP+"', '"+req.body.email+"', '"+req.body.telp+"', '"+req.body.is_admin+"')", function(err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/user');
})

router.post('/submit_edit', upload.array(),  function(req, res){

  // baca name-namenya dari form
  // req.body.nameopo
  
  // senjata
  //console.log(req.body)
  connection.query("update user SET username='"+req.body.username+"', pwd='"+sha1(req.body.pwd)+"', fullname='"+req.body.fullname+"', NIP='"+req.body.NIP+"', email='"+req.body.email+"', telp='"+req.body.telp+"', is_admin='"+req.body.is_admin+"' WHERE id_user='"+req.body.id_user+"' ", function(err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/user/edit/'+req.body.id_user);
})

   
module.exports = router;
