var connection = require('../database').connection;
var express = require('express');
var router = express.Router();

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , flash=require("connect-flash")
  ,  sha1 = require('sha1');

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.json());
  router.use(cookieParser() );
  router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge : 1200000 },saveUninitialized: true, resave: true }));
  router.use(passport.initialize());
  router.use(passport.session());
  router.use(flash());  
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});
passport.use(new LocalStrategy({
  passReqToCallback : true
},
  function(req, username, password, done) {
    connection.query("SELECT * from user WHERE username='"+username+"'", function(err, rows, fields) {
      if (err) throw err;
   
    //  console.log(rows)
    if(rows.length >0){
    	rows[0].tujuan = req.body.tujuan;
    	 if (rows[0].pwd != sha1(password)) {
    	      return done(null, false, req.flash('pesan','Password salah'), req.flash('tujuan',req.body.tujuan));
    	    }else{
    	    	return done(null, rows);
    	    }

    	}else{
    		return done(null, false, req.flash('pesan','Username tidak ditemukan'), req.flash('tujuan',req.body.tujuan));
    	}
            
    //res.end(JSON.stringify(rows))

      // MySQL query...
    //ambil geojson
     
    });
  }
    	
));
passport.use(new GoogleStrategy({
    clientID: "1017151440022-7jkuiqa8t0eqpebbl85nktugmh8rqpvm.apps.googleusercontent.com",
    clientSecret: "37VDcokioP5LluYvts_rfZio",
    callbackURL: "http://singmantap.jeparakab.go.id/autentifikasi/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile)
    connection.query("SELECT * from user WHERE email='"+profile.emails[0].value+"' and google='1'", function(err, rows, fields) {
      if (err) throw err;
    
    //  console.log(rows)
    if(rows.length >0){
     // rows[0].tujuan = req.body.tujuan;
          return done(null, rows);
         

      }else{
        //return done(null, false, req.flash('pesan','Username tidak ditemukan'), req.flash('tujuan',req.body.tujuan));
          connection.query("insert into user (id_google, fullname, google, foto, email) VALUES ('"+profile.id+"', '"+profile.displayName+"', '1', '"+profile.photos[0].value+"', '"+profile.emails[0].value+"')", function(err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
    connection.query("SELECT * from user WHERE email='"+profile.emails[0].value+"' and google='1'", function(err, rows, fieldss) {
      return done(null, rows);
    })
   
  })

      }
            
    //res.end(JSON.stringify(rows))

      // MySQL query...
    //ambil geojson
     
    });
  //  console.log(profile)
    //   return done(null, profile);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
router.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.email'] }));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
console.log(req.user)
    res.redirect("/izin_pemanfaatan_ruang")}
  );


router.get('/', function(req, res) {
var tujuan = req.flash('tujuan');
var pesan = req.flash('pesan');
var menuju = "/manajemen_izin_pemanfaatan_ruang";
	if(tujuan!=""){
		 menuju = tujuan;
	}
  else if(req.query.tujuan != undefined){
    menuju = req.query.tujuan;
  }
	res.render('login', { pesan: pesan, tujuan : menuju });
});
// define the home page route
router.post('/login',
  passport.authenticate('local', { 
                                   failureRedirect: '/administrator/login',
                                   failureFlash: true }), function(req, res) {
    res.redirect(req.user[0].tujuan)}
);
// define the about route
router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});
router.get('/logout_google', function(req, res){
  req.logout();
  res.redirect('https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=https://singmantap.jeparakab.go.id');
});

module.exports.router = router;
module.exports.cek_login = function(req, res, next) {
console.log(req.user);
	if (req.isAuthenticated() && req.user[0].google != 1){
        next();
	
    } else {
        res.redirect('/autentifikasi?tujuan='+encodeURIComponent(req.originalUrl));
    }
}
module.exports.cek_login_google = function(req, res, next) {
  if (req.isAuthenticated() && req.user[0].google != 0){
        next();
  
    } else {
        res.redirect('/autentifikasi/auth/google?tujuan='+encodeURIComponent(req.originalUrl));
    }
}

module.exports.cek_login_is_admin = function(req, res, next) {
    if (req.isAuthenticated()){
          next();
    
      } else {
          res.redirect('/administrator/login');
      }
  }