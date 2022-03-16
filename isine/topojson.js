var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , cookieParser = require('cookie-parser');
 var cek_login = require('./login').cek_login;
var dbgeo = require("dbgeo");


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



      router.get('/json_kec', function(req, res){
  //connection.connect();
  //console.log(req.query)
  connection.query("SELECT x(centroid(a.the_geom)) as x, y(centroid(a.the_geom)) as y, a.nama_kecamatan as kec FROM master_kecamatan a" , function(err, rows, fields) {
    if (err) throw err;

   //console.log("SELECT asWkt(admin_kec.the_geom) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.the_geom");

  //res.end(JSON.stringify(rows))

    // MySQL query...
  //ambil geojson
  res.send(JSON.stringify(rows))
  });

  //connection.end();
  })
   router.get('/topojson_kec', function(req, res){
 //connection.connect();
 //console.log(req.query)
 if(req.query.id_kec){
   var tambahan = "where id_kec= '"+req.query.id_kec+"'";
 }else{
   var tambahan = "";
     
 }
 connection.query("SELECT asWkt(the_geom) as geometry, nama_kecamatan as kecamatan FROM master_kecamatan "+tambahan, function(err, rows, fields) {
   if (err) throw err;

  //console.log("SELECT asWkt(admin_kec.the_geom) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.the_geom");

 //res.end(JSON.stringify(rows))

   // MySQL query...
 //ambil geojson
   dbgeo.parse({
   "data": rows,
   "outputFormat": "topojson",
   "geometryColumn": "geometry",
   "geometryType": "wkt"
 },function(error, result) {
   if (error) {
     return console.log(error);
   }
   // This will log a valid GeoJSON object
  // console.log(result)  
   res.send(JSON.stringify(result))
 });
 });

 //connection.end();
 })

   router.get('/topojson_desa', function(req, res){
//connection.connect();
//console.log(req.query)
connection.query("SELECT asWkt(a.the_geom) as geometry, a.nama_kelurahan as desa, a.id_kelurahan FROM master_kelurahan a  WHERE mbrIntersects(a.the_geom,  GeomFromText('POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))', 1))", function(err, rows, fields) {
  if (err) throw err;

 //console.log("SELECT asWkt(admin_kec.the_geom) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.the_geom");

//res.end(JSON.stringify(rows))

  // MySQL query...
//ambil geojson
  dbgeo.parse({
  "data": rows,
  "outputFormat": "topojson",
  "geometryColumn": "geometry",
  "geometryType": "wkt"
},function(error, result) {
  if (error) {
    return console.log(error);
  }
  // This will log a valid GeoJSON object
 // console.log(result)  
  res.send(JSON.stringify(result))
});
});

//connection.end();
})
 // router.get('/bencana', function(req, res){
 // //connection.connect();
 // //console.log(req.query)
 // var tambahan = "where deleted=0";
 // if(req.query.id_kec){
 //    tambahan = tambahan+" and id_desa= '"+req.query.id_kec+"'";
 // }
 // connection.query("SELECT asWkt(a.SHAPE) as geometry, id  FROM angin_puting_beliung_dan_hujan_deras a "+tambahan, function(err, rows, fields) {
 //   if (err) throw err;

 //  //console.log("SELECT asWkt(admin_kec.the_geom) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.the_geom");

 // //res.end(JSON.stringify(rows))

 //   // MySQL query...
 // //ambil geojson
 //   dbgeo.parse({
 //   "data": rows,
 //   "outputFormat": "topojson",
 //   "geometryColumn": "geometry",
 //   "geometryType": "wkt"
 // },function(error, result) {
 //   if (error) {
 //     return console.log(error);
 //   }
 //   // This will log a valid GeoJSON object
 //  // console.log(result)  
 //   res.send(JSON.stringify(result))
 // });
 // });

 // //connection.end();
 // })

 router.get('/unsur_lain', function(req, res){
 //connection.connect();
 //console.log(req.query)
 var tambahan = "where deleted=0";
 if(req.query.id_kec){
    tambahan = tambahan+" and kecamatan= '"+req.query.id_kec+"'";
 }
 connection.query("SELECT asWkt(unsur_lain.the_geom) as geometry, id, nm_unsur, nm_daerah, nm_sepakat, kls_unsur  FROM unsur_lain "+tambahan, function(err, rows, fields) {
   if (err) throw err;

  //console.log("SELECT asWkt(admin_kec.the_geom) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.the_geom");

 //res.end(JSON.stringify(rows))

   // MySQL query...
 //ambil geojson
   dbgeo.parse({
   "data": rows,
   "outputFormat": "topojson",
   "geometryColumn": "geometry",
   "geometryType": "wkt"
 },function(error, result) {
   if (error) {
     return console.log(error);
   }
   // This will log a valid GeoJSON object
  // console.log(result)  
   res.send(JSON.stringify(result))
 });
 });


 //connection.end();
 })
   
           router.get('/list_polaruang', function(req, res){
    //connection.connect();
   // console.log(req.query.kode_kab)
    var a = '';
    if(req.query.x != undefined && req.query.y != undefined){
      a = "where ST_Within(GeomFromText('POINT("+req.query.x+" "+req.query.y+")'),a.SHAPE);";
    }else if(req.query.p != undefined){
      a = "where ST_Intersects(a.SHAPE, GeomFromText('"+req.query.p+"'));";
    }
    connection.query("SELECT distinct(a.sub_zona) as rencana_tg, a.kode FROM merge1 a "+a , function(err, rows, fields) {
      if (err) throw err;

      res.send(JSON.stringify(rows))
    });
    //connection.end();
    })

                   router.get('/bencana', function(req, res){
            //connection.connect();
           // console.log(req.query.kode_kab)
           var tambahan = "where deleted=0";
           if(req.query.id_desa){
              tambahan = tambahan+" and id_desa= '"+req.query.id_desa+"'";
           }
            if(req.query.id_bencana){
              tambahan = tambahan+" and id_bencana= '"+req.query.id_bencana+"'";
           }
           if(req.query.tahun){
              tambahan = tambahan+" and Year(tgl_kejadian)= '"+req.query.tahun+"'";
           }
            connection.query("SELECT *, DATE_FORMAT(tgl_kejadian, '%d-%m-%Y') as tgl_tampil FROM bencana a "+tambahan , function(err, rows, fields) {
              if (err) throw err;

              res.send(JSON.stringify(rows))
            });
            //connection.end();
            })

                    router.get('/jumlah_bencana', function(req, res){
            //connection.connect();
           // console.log(req.query.kode_kab)
           var tambahan = "where deleted=0";
           if(req.query.id_desa){
              tambahan = tambahan+" and id_desa= '"+req.query.id_desa+"'";
           }
            if(req.query.id_bencana){
              tambahan = tambahan+" and id_bencana= '"+req.query.id_bencana+"'";
           }
           if(req.query.tahun){
              tambahan = tambahan+" and Year(tgl_kejadian)= '"+req.query.tahun+"'";
           }
            connection.query("SELECT count(id) as jml FROM bencana a "+tambahan , function(err, rows, fields) {
              if (err) throw err;

              res.send(JSON.stringify(rows))
            });
            //connection.end();
            })

                 router.get('/topojson_polaruang', function(req, res){
            //connection.connect();
           // console.log(req.query.kode_kab)
            var a = '';
         
            if(req.query.kode != undefined){
              a = "WHERE a.kode =  "+req.query.kode;
            }
            connection.query("SELECT asWkb(a.SHAPE) as geometry, a.sub_zona as isi FROM merge1 a "+a , function(err, rows, fields) {
              if (err) throw err;

             //console.log("SELECT asWkt(admin_kec.the_geom) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.the_geom");

            //res.end(JSON.stringify(rows))

              // MySQL query...
            //ambil geojson
              dbgeo.parse({
              "data": rows,
              "outputFormat": "topojson",
              "geometryColumn": "geometry",
              "geometryType": "wkb"
            },function(error, result) {
              if (error) {
                return console.log(error);
              }
              // This will log a valid GeoJSON object
             // console.log(result)  
              res.send(JSON.stringify(result))
            });
            });
            //connection.end();
            })
module.exports = router;
