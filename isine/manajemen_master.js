var connection = require("../database").connection;
var express = require("express");
var router = express.Router();
var passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy,
  static = require("serve-static"),
  bodyParser = require("body-parser"),
  cookieParser = require("cookie-parser"),
  path = require("path"),
  sha1 = require("sha1");
var sql_enak = require("../database/mysql_enak.js").connection;
var cek_login = require("./login").cek_login;
var cek_login_google = require("./login").cek_login_google;
var dbgeo = require("dbgeo");
var multer = require("multer");
var st = require("knex-postgis")(sql_enak);
var deasync = require("deasync");
path.join(__dirname, "/public/foto");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(cookieParser());
router.use(passport.initialize());
router.use(passport.session());
router.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log("Time: ", Date.now());
  next();
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/foto/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

var upload = multer({ storage: storage });

//start-------------------------------------
router.get("/perusahaan", cek_login, function (req, res) {
  connection.query(
    "SELECT * from perusahaan where deleted=0 ",
    function (err, rows, fields) {
      if (err) throw err;
      numRows = rows.length;
      console.log(rows);
      res.render("content-backoffice/manajemen_perusahaan/list", {
        data: rows,
      });
    }
  );
});
router.post(
  "/perusahaan/submit_insert_perusahaan",
  cek_login,
  async function (req, res) {
    connection.query(
      "SELECT * FROM perusahaan WHERE namaPerusahaan = '" +
        req.body.namaPerusahaan +
        "';"
    );
    await connection.query(
      "INSERT INTO perusahaan(deleted, namaPerusahaan, alamatPerusahaan, noTeleponPerusahaan, emailPerusahaan, direkturPerusahaan, anggotaAsosiasiPerusahaan, noNpwp, nib, kbli, tanggalSbu, berlakuSbu, noIujk, tanggalIujk, berlakuIujk, noAkte, tanggalAkte, jenisUsaha, namaNotaris, alamatNotaris, kotaNotaris, provinsiNotaris)VALUES(" +
        "0,'" +
        req.body.namaPerusahaan +
        "', '" +
        req.body.alamatPerusahaan +
        "', '" +
        req.body.noTeleponPerusahaan +
        "', '" +
        req.body.emailPerusahaan +
        "', '" +
        req.body.direkturPerusahaan +
        "', '" +
        req.body.anggotaAsosiasiPerusahaan +
        "', '" +
        req.body.noNpwp +
        "', '" +
        req.body.nib +
        "', '" +
        req.body.kbli +
        "', '" +
        req.body.tanggalSbu +
        "', '" +
        req.body.berlakuSbu +
        "', '" +
        req.body.noIujk +
        "', '" +
        req.body.tanggalIujk +
        "', '" +
        req.body.berlakuIujk +
        "', '" +
        req.body.noAkte +
        "', '" +
        req.body.tanggalAkte +
        "', '" +
        req.body.jenisUsaha +
        "', '" +
        req.body.namaNotaris +
        "', '" +
        req.body.alamatNotaris +
        "', '" +
        req.body.kotaNotaris +
        "', '" +
        req.body.provinsiNotaris +
        "');",
      function (err, rows, fields) {
        if (err) throw err;
        numRows = rows.affectedRows;
      }
    );
    // }
    res.redirect("/manajemen_master/perusahaan");
  }
);

router.get("/perusahaan/insert", cek_login, function (req, res) {
  connection.query(
    "select * from perusahaan where perusahaanId='" + req.params.id + "'",
    function (err, rows, fields) {
      if (err) throw err;
      res.render("content-backoffice/manajemen_perusahaan/insert", {
        data: rows,
      });
    }
  );
});

router.get("/perusahaan/edit/:id", cek_login, function (req, res) {
  connection.query("select * from perusahaan where perusahaanId='"+req.params.id+"'", function(err, rows, fields) {
    if (err) throw err;
  res.render("content-backoffice/manajemen_perusahaan/edit", {data : rows});
  })
});

router.get("/perusahaan/delete/:id", cek_login, function (req, res) {
  connection.query(
    "update perusahaan SET deleted=1 WHERE perusahaanId='" +
      req.params.id +
      "' ",
    function (err, rows, fields) {
      if (err) throw err;
      numRows = rows.affectedRows;
    }
  );
  res.redirect('/manajemen_master/perusahaan');
});

router.post('/perusahaan/submit_edit',cek_login,  function(req, res){
  connection.query("update perusahaan SET namaPerusahaan='"+req.body.namaPerusahaan+"', alamatPerusahaan='"+req.body.alamatPerusahaan+"', noTeleponPerusahaan='"+req.body.noTeleponPerusahaan+"', emailPerusahaan='"+req.body.emailPerusahaan+"', direkturPerusahaan='"+req.body.direkturPerusahaan+"', anggotaAsosiasiPerusahaan='"+req.body.anggotaAsosiasiPerusahaan+"', alamatPerusahaan='"+req.body.alamatPerusahaan+"', noNpwp='"+req.body.noNpwp+"', nib='"+req.body.nib+"', kbli='"+req.body.kbli+"', tanggalSbu='"+req.body.tanggalSbu+"', berlakuSbu='"+req.body.berlakuSbu+"', noIujk='"+req.body.noIujk+"', tanggalIujk='"+req.body.tanggalIujk+"', berlakuIujk='"+req.body.berlakuIujk+"', noAkte='"+req.body.noAkte+"', tanggalAkte='"+req.body.tanggalAkte+"', jenisUsaha='"+req.body.jenisUsaha+"', namaNotaris='"+req.body.namaNotaris+"', alamatNotaris='"+req.body.alamatNotaris+"', kotaNotaris='"+req.body.kotaNotaris+"', provinsiNotaris='"+req.body.provinsiNotaris+"' WHERE perusahaanId='"+req.body.perusahaanId+"' ", function(err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/manajemen_master/perusahaan/edit/'+req.body.perusahaanId);
})
module.exports = router;
