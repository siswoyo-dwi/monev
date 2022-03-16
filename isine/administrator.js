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
var cek_login_is_admin = require("./login").cek_login_is_admin;
var dbgeo = require("dbgeo");
var multer = require("multer");
var moment = require("moment");
var CronJob = require("cron").CronJob;

var st = require("knex-postgis")(sql_enak);
path.join(__dirname, "/public/foto");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(cookieParser());
router.use(passport.initialize());
router.use(passport.session());
const resizeOptimizeImages = require('resize-optimize-images');
const resize = (file)=>{
  (async () => {
    // Set the options.
    const options = {
        images: ['./public/foto/'+file],
        quality: 50
    };
 
    // Run the module.
    await resizeOptimizeImages(options);
})();
}
var job = new CronJob(
  "0 0 7 * * 1",
  async function () {
    let x = moment().format("YYYY-MM-DD");
    let data = await sql_enak.raw(
      `SELECT * FROM pekerjaan p WHERE deleted =0 and p.mulaiKontrak < '${x}' and p.akhirKontrak > '${x}'`
    );
    var x2 = moment(x, "YYYY-MM-DD").add(1, "days");
    let new_date = moment(x2).format("YYYY-MM-DD");
    for (let i = 0; i < data[0].length; i++) {
      let jumlah = await sql_enak.raw(
        `SELECT count(*) as jml FROM laporan_mingguan lm where lm.deleted =0 and lm.pekerjaanId = ${data[0][i].id} `
      );
      await sql_enak.raw(
        `INSERT into laporan_mingguan (pekerjaanId,periode,deleted,tanggal) values (${data[0][i].id},${jumlah[0][0].jml},0,'${new_date}')`
      );
    }
  },
  null,
  true,
  "Asia/Jakarta"
);
job.start();

var checkKelengkapan = new CronJob(
  "0 0 7 * * 6",
  async function () {
    let data = await sql_enak.raw(`SELECT * from laporan_mingguan lm where deleted =0`)
  // console.log(data[0])
  for(let i=0; i<data[0].length;i++){
    let ubah = false
    if(data[0][i].foto1 == null || data[0][i].foto2 == null || data[0][i].foto3 == null || data[0][i].foto4 == null || data[0][i].fileLaporan == null){
      if(data[0][i].peringatanFile ==1){
        ubah=true
        data[0][i].peringatanFile =0
      }
    }
    else{
      if(data[0][i].peringatanFile ==0){
        ubah=true
        data[0][i].peringatanFile =1
      }
    }


    if(data[0][i].progress<data[0][i].target){
      if(data[0][i].peringatanTarget ==1){
        ubah=true
        data[0][i].peringatanTarget=0
      }
    }
    else{
      if(data[0][i].peringatanTarget ==0){
        ubah=true
        data[0][i].peringatanTarget=1
      }
    }

    // console.log(ubah)
    if(ubah==true){
      await sql_enak.raw(
        `UPDATE laporan_mingguan lm set lm.peringatanFile =${data[0][i].peringatanFile},lm.peringatanTarget =${data[0][i].peringatanTarget} where lm.deleted =0 and lm.id =${data[0][i].id}`
      );
    }
  }
    
  },
  null,
  true,
  "Asia/Jakarta"
);

checkKelengkapan.start();



// async function job2() {
//   let x = moment().format('YYYY-MM-DD')

//   let data = await sql_enak.raw(`SELECT * FROM pekerjaan p WHERE deleted =0 and p.mulaiKontrak < '${x}' and p.akhirKontrak > '${x}'`)

//   for(let i=0;i<data[0].length;i++){
//     let jumlah = await sql_enak.raw(`SELECT count(*) as jml FROM laporan_mingguan lm where lm.deleted =0 and lm.pekerjaanId = ${data[0][i].id} `)
//     await sql_enak.raw(`INSERT into laporan_mingguan (pekerjaanId,periode,deleted) values (${data[0][i].id},${jumlah[0][0].jml},0)`)

// }
// }
// job2()



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
  // console.log('Time: ', Date.now());
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
router.get("/login",async function (req, res) {
  res.render("content/login");
});

router.get("/dashboard", cek_login_is_admin,
  async function (req, res) {
    res.render("content/dashboard");
  });
router.get("/data_chart",async function (req, res) {
  const data = await sql_enak.raw(`SELECT mk.nama_kecamatan,kecamatanId ,
  (SELECT COUNT(*) from pekerjaan p2 where p2.jenisPekerjaan ='kontraktor' and p2.kecamatanId =p.kecamatanId and p2.deleted =0 ) as jumlah_kontraktor,
  (SELECT COUNT(*) from pekerjaan p3 WHERE p3.jenisPekerjaan = 'konsultan' and p3.kecamatanId=p.kecamatanId and p3.deleted=0) as jumlah_konsultan 
  from pekerjaan p join master_kecamatan mk on p.kecamatanId = mk.id_kecamatan where p.deleted =0
  GROUP by p.kecamatanId`)
   res.json({ data:data[0] })
})
// PERUSAHAAN
router.get("/perusahaan", cek_login_is_admin, function (req, res) {
  sql_enak
    .select("*")
    .from("perusahaan")
    .where("deleted", 0)
    .orderBy('id', 'desc')
    .then(function (rows) {
      res.render("content/perusahaan", {
        data: rows,
      });
    });
});

router.post(
  "/perusahaan/submit_insert_perusahaan",
  cek_login_is_admin, upload.fields([
    { name: "fotoNpwp", maxCount: 1 }
  ]),
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files["fotoNpwp"]) {
        var nama_file = req.files["fotoNpwp"][0].filename;
        post["fotoNpwp"] = nama_file;
         resize(nama_file)

      }
    }
    post.deleted=0
    sql_enak
      .insert(post)
      .into("perusahaan")
      .then(function (id) { })
      .finally(function () {
        res.redirect("/administrator/perusahaan");
      });
  }
);
router.get("/perusahaan/insert", cek_login_is_admin, function (req, res) {
  res.render("content/insert_perusahaan");
});
router.get("/tambahdata/:id", function (req, res) {
  // await sql_enak(`laporan_mingguan`).update
  connection.query(`SELECT lm.periode  FROM laporan_mingguan lm WHERE lm.pekerjaanId =${req.params.id} ORDER BY lm.periode DESC  limit 1`,async function (err, data) {
  let post = {}
  post.tanggal =moment().format("YYYY-MM-DD");
  post.pekerjaanId=req.params.id;
  post.periode=data[0].periode +1
    await  sql_enak
    .insert(post)
    .into("laporan_mingguan")
    .then(function (id) { })
    .finally(function () {
      res.redirect(`/perusahaan/pekerjaan/monev/${req.params.id}`);
    });
  })
//   await sql_enak(`laporan_mingguan`)
//   .where("id", "=", req.params.id)
//   .update({
//     deleted: 1,
//     thisKeyIsSkipped: undefined,
//   })
//   .then(function (id) { });
// res.redirect("/administrator/perusahaan");
});
router.get("/perusahaan/edit/:id", cek_login_is_admin, function (req, res) {
  connection.query(
    "SELECT *,DATE_FORMAT(tanggalSbu, '%d-%m-%Y') as tglsbu ,DATE_FORMAT(berlakuSbu,'%d-%m-%Y') as bSbu, noIujk,DATE_FORMAT(tanggalIujk, '%d-%m-%Y') as tIujk,DATE_FORMAT(berlakuIujk, '%d-%m-%Y') as bIujk, noAkte,DATE_FORMAT(tanggalAkte, '%d-%m-%Y') as tAkte, jenisUsaha, namaNotaris, alamatNotaris, kotaNotaris, provinsiNotaris FROM perusahaan WHERE id ='" +
    req.params.id +
    "'",
    function (err, rows, fields) {
      if (err) throw err;
      res.render("content/edit_perusahaan", { data: rows });
    }
  );
});
router.post("/perusahaan/submit_edit", cek_login_is_admin, upload.fields([
  { name: "fotoNpwp", maxCount: 1 }
]), function (req, res) {
  var post = {};
  post = req.body;
  if (req.files) {
    if (req.files["fotoNpwp"]) {
      var nama_file = req.files["fotoNpwp"][0].filename;
      post["fotoNpwp"] = nama_file;
       resize(nama_file)

    }
  }
  sql_enak("perusahaan")
    .where("id","=", req.body.id)
    .update(post)
    .then(function (id) { })
    .finally(function () {
      res.redirect("/administrator/perusahaan/edit/" + req.body.id);
    });
});
router.get("/perusahaan/delete/:id", cek_login_is_admin, function (req, res) {
  sql_enak("perusahaan")
    .where("id", "=", req.params.id)
    .update({
      deleted: 1,
      thisKeyIsSkipped: undefined,
    })
    .then(function (id) { });
  res.redirect("/administrator/perusahaan");
});

router.get("/pekerjaan/export_excel", cek_login_is_admin, function (req, res) {
  connection.query(
    "SELECT pekerjaan.nilaiKontrak as nilaiPekerjaan, pekerjaan.jenisPekerjaan as jenisPekerjaan, pekerjaan.nomorKontrak as nomorKontrak , pekerjaan.id as pekerjaanId,pekerjaan.pin as pin,perusahaan.namaPerusahaan as namaPerusahaan , pekerjaan.namaPekerjaan as namaPekerjaan ,perusahaan.noTeleponPerusahaan as noTeleponPerusahaan ,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak  from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id where pekerjaan.deleted=0 ",
    function (err, rows, fields) {
      if (err) throw err;
      numRows = rows.length;
      res.render("content/excel_pekerjaan", { data: rows });
      // res.json({ data: rows })
    }
  );
});

router.get("/pekerjaan", cek_login_is_admin, function (req, res) {
  connection.query(
    "SELECT pekerjaan.status , (SELECT (lm.target-lm.progress  ) FROM laporan_mingguan lm WHERE lm.pekerjaanId = pekerjaan.id ORDER by id LIMIT 1) as selisihTarget,pekerjaan.inserted as inserted ,pekerjaan.buka as buka, pekerjaan.jenisPekerjaan as jenisPekerjaan, pekerjaan.nomorKontrak as nomorKontrak , pekerjaan.id as pekerjaanId,pekerjaan.pin as pin,perusahaan.namaPerusahaan as namaPerusahaan , pekerjaan.namaPekerjaan as namaPekerjaan ,perusahaan.noTeleponPerusahaan as noTeleponPerusahaan ,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak ,DATE_FORMAT((SELECT f.tanggal  from fho f WHERE f.pekerjaanId = pekerjaan.id ORDER by f.id DESC limit 1),'%d-%m-%Y') as tanggal_fho  , DATE_FORMAT((SELECT p.tanggal  from pho p WHERE p.pekerjaanId = pekerjaan.id ORDER by p.id DESC limit 1),'%d-%m-%Y') as tanggal_pho from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id where pekerjaan.deleted=0 ORDER BY pekerjaan.id desc",
    function (err, rows, fields) {
      const datenow = moment().format("YYYY-MM-DD");
      res.render("content/pekerjaan", { data: rows,datenow });
    }
  );
});
router.get("/pekerjaan/buka/:id/:buka", cek_login_is_admin, function (req, res) {
  let x = 0
  if (req.params.buka==0) {
    x = 1
  } else {
    x = 0
  }
  connection.query(
    `UPDATE pekerjaan SET buka=${x} WHERE id=${req.params.id}`,
    function (err, rows, fields) {
      res.redirect(`/administrator/pekerjaan`)    
    }
  );
});
router.get("/pekerjaan/insert", cek_login_is_admin,async function (req, res) {
  const perusahaan = await sql_enak.raw(`SELECT perusahaan.id as id , perusahaan.namaPerusahaan as namaPerusahaan from perusahaan where deleted = 0`  )
  const kecamatan =await sql_enak.raw(`SELECT master_kecamatan.id_kecamatan as id  , master_kecamatan.nama_kecamatan as nama_kecamatan from master_kecamatan `  )

  res.render("content/insert_pekerjaan", {
          perusahaan: perusahaan[0],
          kecamatan:kecamatan[0],
        });

});
router.get("/get_kelurahan/:id", async function (req,res) {
 const data = await sql_enak.raw(`SELECT master_kelurahan.id_kecamatan as id_kecamatan,  master_kelurahan.id_kelurahan as id , master_kelurahan.nama_kelurahan as nama_kelurahan from master_kelurahan where deleted = 0 and master_kelurahan.id_kecamatan=${req.params.id}`  )
 res.json({ data: data[0] })
})
router.post(
  "/pekerjaan/submit_insert_pekerjaan",
  cek_login_is_admin,

  upload.fields([
    { name: "bpjs", maxCount: 1 },
    { name: "rkk", maxCount: 1 },
    { name: "ketBank", maxCount: 1 },
    { name: "bukuBank", maxCount: 1 },
    { name: "jaminanPelaksanaan", maxCount: 1 },
    { name: "jaminanPemeliharaan", maxCount: 1 },
    { name: "jaminanUangMuka", maxCount: 1 },
    { name: "fotoSpmk", maxCount: 1 },
    { name: "fotoKontrak", maxCount: 1 },
    { name: "fotoDPA", maxCount: 1 },
  ]),


  async function (req, res) {
    var post = {};
    let pin = (length) => {
      let result = '';
      let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    }
    let x = ''
    let get_pin = async () => {
      x = pin(6)
      let y = await sql_enak.raw(`select pin from pekerjaan where pin = '${x}'`)
      if (y[0].length) {
        get_pin()
      } else {
        return x
      }
    }
    insert_pin = await get_pin()
    post = req.body;     
    if (req.files) {
      if (req.files["bpjs"]) {
        var nama_file = req.files["bpjs"][0].filename;
        post["bpjs"] = nama_file;
         resize(nama_file)

      }

      if (req.files["rkk"]) {
        var nama_file = req.files["rkk"][0].filename;
        post["rkk"] = nama_file;
         resize(nama_file)

      }
      if (req.files["ketBank"]) {
        var nama_file = req.files["ketBank"][0].filename;
        post["ketBank"] = nama_file;
         resize(nama_file)

      }

      if (req.files["bukuBank"]) {
        var nama_file = req.files["bukuBank"][0].filename;
        post["bukuBank"] = nama_file;
         resize(nama_file)

      }
      if (req.files["jaminanPelaksanaan"]) {
        var nama_file = req.files["jaminanPelaksanaan"][0].filename;
        post["jaminanPelaksanaan"] = nama_file;
         resize(nama_file)

      }

      if (req.files["jaminanPemeliharaan"]) {
        var nama_file = req.files["jaminanPemeliharaan"][0].filename;
        post["jaminanPemeliharaan"] = nama_file;
         resize(nama_file)

      }
      if (req.files["jaminanUangMuka"]) {
        var nama_file = req.files["jaminanUangMuka"][0].filename;
        post["jaminanUangMuka"] = nama_file;
         resize(nama_file)

      }

      if (req.files["fotoSpmk"]) {
        var nama_file = req.files["fotoSpmk"][0].filename;
        post["fotoSpmk"] = nama_file;
         resize(nama_file)

      }
      if (req.files["fotoKontrak"]) {
        var nama_file = req.files["fotoKontrak"][0].filename;
        post["fotoKontrak"] = nama_file;
         resize(nama_file)

      }
      if (req.files["fotoDPA"]) {
        var nama_file = req.files["fotoDPA"][0].filename;
        post["fotoDPA"] = nama_file;
         resize(nama_file)

      }
    }
    let d =new Date
    post.deleted=0
    post.inserted= d.getFullYear()
    console.log(req.body,'body');
    console.log(req.files,'files');

    if (insert_pin) {
      post.pin = insert_pin
      sql_enak
        .insert(post)
        .into("pekerjaan")
        .then(function (id) { 
          connection.query(`SELECT pin FROM pekerjaan p WHERE id=${id[0]}`,function (err,rows,fields) {
            console.log(rows[0].pin);
            // res.json(rows[0].pin)
            res.redirect("/administrator/pekerjaan")   
          })
        })
        // .finally(function () {
        //   res.render("/administrator/pekerjaan",{});
        // });
    }

  }
);

router.post(
  "/pekerjaan/submit_edit_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "bpjs", maxCount: 1 },
    { name: "rkk", maxCount: 1 },
    { name: "ketBank", maxCount: 1 },
    { name: "bukuBank", maxCount: 1 },
    { name: "jaminanPelaksanaan", maxCount: 1 },
    { name: "jaminanPemeliharaan", maxCount: 1 },
    { name: "jaminanUangMuka", maxCount: 1 },
    { name: "fotoSpmk", maxCount: 1 },
    { name: "fotoKontrak", maxCount: 1 },
    { name: "fotoDPA", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files["bpjs"]) {
        var nama_file = req.files["bpjs"][0].filename;
        post["bpjs"] = nama_file;
         resize(nama_file)

      }

      if (req.files["rkk"]) {
        var nama_file = req.files["rkk"][0].filename;
        post["rkk"] = nama_file;
         resize(nama_file)

      }
      if (req.files["ketBank"]) {
        var nama_file = req.files["ketBank"][0].filename;
        post["ketBank"] = nama_file;
         resize(nama_file)

      }

      if (req.files["bukuBank"]) {
        var nama_file = req.files["bukuBank"][0].filename;
        post["bukuBank"] = nama_file;
         resize(nama_file)

      }
      if (req.files["jaminanPelaksanaan"]) {
        var nama_file = req.files["jaminanPelaksanaan"][0].filename;
        post["jaminanPelaksanaan"] = nama_file;
         resize(nama_file)

      }

      if (req.files["jaminanPemeliharaan"]) {
        var nama_file = req.files["jaminanPemeliharaan"][0].filename;
        post["jaminanPemeliharaan"] = nama_file;
         resize(nama_file)

      }
      if (req.files["jaminanUangMuka"]) {
        var nama_file = req.files["jaminanUangMuka"][0].filename;
        post["jaminanUangMuka"] = nama_file;
         resize(nama_file)

      }

      if (req.files["fotoSpmk"]) {
        var nama_file = req.files["fotoSpmk"][0].filename;
        post["fotoSpmk"] = nama_file;
         resize(nama_file)

      }
      if (req.files["fotoKontrak"]) {
        var nama_file = req.files["fotoKontrak"][0].filename;
        post["fotoKontrak"] = nama_file;
         resize(nama_file)

      }
      if (req.files["fotoDPA"]) {
        var nama_file = req.files["fotoDPA"][0].filename;
        post["fotoDPA"] = nama_file;
         resize(nama_file)

      }
    }
console.log(req.body,req.files,'body');
    sql_enak("pekerjaan")
      .where("id", "=", req.body.id)
      .update(post)
      .then(function (id) { });
    // res.redirect("/administrator/pekerjaan/edit/" + req.body.id);
      res.redirect("/administrator/pekerjaan");
  }
);
router.get("/pekerjaan/delete/:id", cek_login_is_admin, function (req, res) {
  sql_enak("pekerjaan")
    .where("id", "=", req.params.id)
    .update({
      deleted: 1,
      thisKeyIsSkipped: undefined,
    })
    .then(function (id) { });
  res.redirect("/administrator/pekerjaan");
});

router.get("/pekerjaan/edit/:id", cek_login_is_admin,async function (req, res) {
  let jenisPekerjaan = ['kontraktor', 'konsultan']
  let sisaJenisPekerjaan = []

  connection.query(
    `SELECT *,DATE_FORMAT(tanggalSpmk, '%d-%m-%Y') as  tanggalSpmk  ,DATE_FORMAT(mulaiKontrak, '%d-%m-%Y') as  mulaiKontrak,DATE_FORMAT(akhirKontrak, '%d-%m-%Y') as   akhirKontrak FROM pekerjaan join master_kecamatan ON master_kecamatan.id_kecamatan=pekerjaan.kecamatanId join master_kelurahan ON master_kelurahan.id_kelurahan=pekerjaan.kelurahanId WHERE id =${req.params.id}`,
    function (err, rows, fields) {
      connection.query(
        `SELECT * from perusahaan where deleted=0 and not id=${rows[0]["perusahaanId"]} `,
        function (err, rowss, fields) {
          connection.query(
            `SELECT * from perusahaan where id=${rows[0]["perusahaanId"]} `,
            async   function (err, rowsss, fields) {
              for (let i = 0; i < jenisPekerjaan.length; i++) {
                if (jenisPekerjaan[i] !== rows[0].jenisPekerjaan) {
                  sisaJenisPekerjaan.push(jenisPekerjaan[i])
                }
              }
              const kecamatan =await sql_enak.raw(`SELECT master_kecamatan.id_kecamatan as id  , master_kecamatan.nama_kecamatan as nama_kecamatan from master_kecamatan `  )
              const kelurahan =await sql_enak.raw(`SELECT master_kelurahan.id_kelurahan as id  , master_kelurahan.nama_kelurahan as nama_kelurahan from master_kelurahan where master_kelurahan.id_kecamatan = ${rows[0].kecamatanId}`  )
            
              res.render("content/edit_pekerjaan", {
                sisaJenisPekerjaan: sisaJenisPekerjaan,
                data: rows,
                perusahaan: rowss,
                dataPerusahaan: rowsss,
                kecamatan:kecamatan[0],
                kelurahan:kelurahan[0]
                
              });
            }
          );
        }
      );
    }
  );
});

router.get(
  "/pekerjaan/monev/:id",
  cek_login_is_admin,
  async function (req, res) {
    const user = req.user[0]
    const data = await sql_enak.raw(
      `SELECT * , pekerjaan.id as pekerjaanId , perusahaan.id as perusahaanId, DATE_FORMAT( pekerjaan.tanggalSpmk ,'%d-%m-%Y') as tanggalSpmk   ,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak , pekerjaan.perusahaanId as perusahaanId from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id INNER JOIN master_kelurahan mk ON mk.id_kelurahan =kelurahanId INNER JOIN master_kecamatan mk2 on mk2.id_kecamatan = kecamatanId where pekerjaan.id=${req.params.id}`
    );
    const termin = await sql_enak.raw(
      `SELECT *,DATE_FORMAT( termin.tanggalPembayaran ,'%d-%m-%Y') as tanggalPembayaran  FROM termin where pekerjaanId = ${req.params.id} and deleted =0 `
    );
    const laporan_mingguan = await sql_enak.raw(
      `SELECT *,DATE_FORMAT( lm.tanggal ,'%Y-%m-%d') as tanggal FROM laporan_mingguan lm WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const adendum = await sql_enak.raw(
      `SELECT *,DATE_FORMAT( adendum.tanggal ,'%d-%m-%Y') as tanggal FROM adendum WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const pengendalian = await sql_enak.raw(
      `SELECT *, DATE_FORMAT( pengendalianPengawasan.tanggal ,'%d-%m-%Y') as tanggal FROM pengendalianPengawasan WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const peringatan = await sql_enak.raw(
      `SELECT *, DATE_FORMAT( peringatan.tanggal ,'%d-%m-%Y') as tanggal FROM peringatan WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const konsultan = await sql_enak.raw(
      `SELECT * FROM laporan_konsultan WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const laporanBulanan = await sql_enak.raw(`select * from laporan_bulanan where deleted = 0 and pekerjaanId = ${req.params.id}`)

    const pho = await sql_enak.raw(
      `SELECT *,DATE_FORMAT( pho.tanggal ,'%d-%m-%Y') as tanggal   FROM pho WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const fho = await sql_enak.raw(
      `SELECT *,DATE_FORMAT( fho.tanggal ,'%d-%m-%Y') as tanggal   FROM fho WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
    );
    const target_mingguan=await sql_enak.raw(`SELECT * FROM target_mingguan tm WHERE pekerjaanId =  ${req.params.id}`)

    const uji_coba = await sql_enak.raw(`SELECT *,DATE_FORMAT(uc.tanggal,'%d-%m-%Y') as tanggal FROM uji_coba uc WHERE pekerjaanId = ${req.params.id} and deleted = 0 `)
    const datenow = moment().format("YYYY-MM-DD");
    const dateArray = [];
    const deadline = [];
    
    var x2 = "";
    for (let i = 0; i < laporan_mingguan[0].length; i++) {
      x2 = moment(laporan_mingguan[0][i].tanggal, "YYYY-MM-DD").add(2, "days");
      dateArray.push(moment(x2).format("YYYY-MM-DD"));
      let a = moment(datenow);
      let cek_deadline = a.diff(laporan_mingguan[0][i].tanggal, "days");
      if (cek_deadline <= 7) {
        deadline.push(true);
      } else {
        deadline.push(false);
      }
    }
    sql_enak("pekerjaan")
        .where("id","=", req.params.id)
        .update({
          status: 0,
          thisKeyIsSkipped: undefined,
        })
        .then(function (id) { })
        .finally(function () {
          res.render("content/monev_pekerjaan", {
            data: data[0],
            termin: termin[0],
            laporan_mingguan: laporan_mingguan[0],
            adendum: adendum[0],
            peringatan: peringatan[0],
            pengendalian: pengendalian[0],
            laporanBulanan: laporanBulanan[0],
            moment: moment,
            konsultan: konsultan[0],
            datenow: datenow,
            dateArray: dateArray,
            deadline: deadline,
            user: user,
            pho:pho[0],
            fho:fho[0],
            uji_coba:uji_coba[0],
            target_mingguan:target_mingguan[0]
          });        });
   
  }
);

router.post(
  "/pekerjaan/submit_termin_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
    { name: "sts_denda", maxCount: 1 },
    { name: "surat_permohonan", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.beritaAcara) {
        const nama_file = req.files.beritaAcara[0].filename;
        post.beritaAcara = nama_file;
         resize(nama_file)

      }
      if (req.files.dokumentasi) {
        const nama_file = req.files.dokumentasi[0].filename;
        post.dokumentasi = nama_file;
         resize(nama_file)
      }
      if (req.files.sts_denda) {
        const nama_file = req.files.sts_denda[0].filename;
        post.sts_denda = nama_file;
         resize(nama_file)
      }
      if (req.files.surat_permohonan) {
        const nama_file = req.files.surat_permohonan[0].filename;
        post.surat_permohonan = nama_file;
         resize(nama_file)

      }
    }
    post.status = 'Terkirim';
    post.deleted = 0;
    sql_enak("termin")
      .insert(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  }
);
router.post(
  "/pekerjaan/submit_Edit_termin_pekerjaan",
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
    { name: "sts_denda", maxCount: 1 },
    { name: "surat_permohonan", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.beritaAcara) {
        const nama_file = req.files.beritaAcara[0].filename;
        post.beritaAcara = nama_file;
         resize(nama_file)

      }
      if (req.files.dokumentasi) {
        const nama_file = req.files.dokumentasi[0].filename;
        post.dokumentasi = nama_file;
         resize(nama_file)

      }
      if (req.files.sts_denda) {
        const nama_file = req.files.sts_denda[0].filename;
        post.sts_denda = nama_file;
         resize(nama_file)
      }
      if (req.files.surat_permohonan) {
        const nama_file = req.files.surat_permohonan[0].filename;
        post.surat_permohonan = nama_file;
         resize(nama_file)

      }
    }
    post.deleted = 0;
    sql_enak("termin")
      .where("id", "=", req.body.id)
      .update(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  });
router.get(
  "/pekerjaan/delete_termin/:id/:idPekerjaan",
  cek_login_is_admin,
  function (req, res) {
    sql_enak("termin")
      .where("id", "=", req.params.id)
      .update({
        deleted: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (params) { });
    res.redirect("/administrator/pekerjaan/monev/" + req.params.idPekerjaan);
  }
);

router.post(
  "/pekerjaan/submit_laporan_mingguan_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "fileLaporan", maxCount: 1 },
    { name: "foto1", maxCount: 1 },
    { name: "foto2", maxCount: 1 },
    { name: "foto3", maxCount: 1 },
    { name: "foto4", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.fileLaporan) {
        const nama_file = req.files.fileLaporan[0].filename;
        post.fileLaporan = nama_file;
         resize(nama_file)
      }
      if (req.files.foto1) {
        const nama_file = req.files.foto1[0].filename;
        post.foto1 = nama_file;
       resize(nama_file)
    }
      if (req.files.foto2) {
        const nama_file = req.files.foto2[0].filename;
        post.foto2 = nama_file;
         resize(nama_file)
      }
      if (req.files.foto3) {
        const nama_file = req.files.foto3[0].filename;
        post.foto3 = nama_file;
         resize(nama_file)
      }
      if (req.files.foto4) {
        const nama_file = req.files.foto4[0].filename;
        post.foto4 = nama_file;
         resize(nama_file)
      }
    }
    post.deleted = 0;
    sql_enak("laporan_mingguan")
      .where("id","=", req.body.id)
      .update(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  }
);

router.post(
  "/pekerjaan/submit_adendum_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "gambarPerubahan", maxCount: 1 },
    { name: "rabPerubahan", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 }
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.beritaAcara) {
        const nama_file = req.files.beritaAcara[0].filename;
        post.beritaAcara = nama_file;
      }
      if (req.files.gambarPerubahan) {
        const nama_file = req.files.gambarPerubahan[0].filename;
        post.gambarPerubahan = nama_file;
      }
      if (req.files.rabPerubahan) {
        const nama_file = req.files.rabPerubahan[0].filename;
        post.rabPerubahan = nama_file;
      }
      if (req.files.dokumentasi) {
        const nama_file = req.files.dokumentasi[0].filename;
        post.dokumentasi = nama_file;
      }

    }
    post.deleted = 0;
    sql_enak("adendum")
      .insert(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  }
);
router.get(
  "/pekerjaan/delete_adendum/:id/:idPekerjaan",
  cek_login_is_admin,
  function (req, res) {
    sql_enak("adendum")
      .where("id", "=", req.params.id)
      .update({
        deleted: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (params) { });
    res.redirect("/administrator/pekerjaan/monev/" + req.params.idPekerjaan);
  }
);
router.post(
  "/pekerjaan/submit_pengawasan_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.beritaAcara) {
        const nama_file = req.files.beritaAcara[0].filename;
        post.beritaAcara = nama_file;
         resize(nama_file)

      }
      if (req.files.dokumentasi) {
        const nama_file = req.files.dokumentasi[0].filename;
        post.dokumentasi = nama_file;
         resize(nama_file)

      }
    }
    post.deleted = 0;
    sql_enak("pengendalianPengawasan")
      .insert(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  }
);
router.post(
  "/pekerjaan/submit_peringatan_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.beritaAcara) {
        const nama_file = req.files.beritaAcara[0].filename;
        post.beritaAcara = nama_file;
         resize(nama_file)

      }
      if (req.files.dokumentasi) {
        const nama_file = req.files.dokumentasi[0].filename;
        post.dokumentasi = nama_file;
         resize(nama_file)

      }
    }
    post.deleted = 0;
    sql_enak("peringatan")
      .insert(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  });
router.post(
  "/pekerjaan/submit_laporan_bulanan_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "fileLaporan", maxCount: 1 },
    { name: "foto1", maxCount: 1 },
    { name: "foto2", maxCount: 1 },
    { name: "foto3", maxCount: 1 },
    { name: "foto4", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.fileLaporan) {
        const nama_file = req.files.fileLaporan[0].filename;
        post.fileLaporan = nama_file;
         resize(nama_file)

      }
      if (req.files.foto1) {
        const nama_file = req.files.foto1[0].filename;
        post.foto1 = nama_file;
         resize(nama_file)

      }
      if (req.files.foto2) {
        const nama_file = req.files.foto2[0].filename;
        post.foto2 = nama_file;
         resize(nama_file)

      }
      if (req.files.foto3) {
        const nama_file = req.files.foto3[0].filename;
        post.foto3 = nama_file;
         resize(nama_file)

      }
      if (req.files.foto4) {
        const nama_file = req.files.foto4[0].filename;
        post.foto4 = nama_file;
         resize(nama_file)

      }
    }
    post.deleted = 0;
    sql_enak("laporan_bulanan")
      .insert(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  });
router.get(
  "/pekerjaan/delete_laporan_bulanan/:id/:idPekerjaan",
  cek_login_is_admin,
  function (req, res) {
    sql_enak("laporan_bulanan")
      .where("id", "=", req.params.id)
      .update({
        deleted: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (params) { });
    res.redirect("/administrator/pekerjaan/monev/" + req.params.idPekerjaan);
  });


router.post(
  "/pekerjaan/submit_laporan_konsultan_pekerjaan",
  cek_login_is_admin,
  upload.fields([
    { name: "fileLaporan", maxCount: 1 },
    { name: "foto1", maxCount: 1 },
    { name: "foto2", maxCount: 1 },
    { name: "foto3", maxCount: 1 },
    { name: "foto4", maxCount: 1 },
  ]),
  cek_login_is_admin,
  function (req, res) {
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.fileLaporan) {
        const nama_file = req.files.fileLaporan[0].filename;
        post.fileLaporan = nama_file;
         resize(nama_file)

      }
      if (req.files.foto1) {
        const nama_file = req.files.foto1[0].filename;
        post.foto1 = nama_file;
         resize(nama_file)

      }
      if (req.files.foto2) {
        const nama_file = req.files.foto2[0].filename;
        post.foto2 = nama_file;
         resize(nama_file)

      }
      if (req.files.foto3) {
        const nama_file = req.files.foto3[0].filename;
        post.foto3 = nama_file;
         resize(nama_file)

      }
      if (req.files.foto4) {
        const nama_file = req.files.foto4[0].filename;
        post.foto4 = nama_file;
         resize(nama_file)

      }
    }
    post.deleted = 0;
    sql_enak("laporan_konsultan")
      .insert(post)
      .then(function (id) {
        res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  });
  router.get(
    "/pekerjaan/delete_laporan_konsultan/:id/:idPekerjaan",
    cek_login_is_admin,
    function (req, res) {
      sql_enak("laporan_konsultan")
        .where("id", "=", req.params.id)
        .update({
          deleted: 1,
          thisKeyIsSkipped: undefined,
        })
        .then(function (params) { });
      res.redirect("/administrator/pekerjaan/monev/" + req.params.idPekerjaan);
    });
  router.post(
    "/pekerjaan/submit_pho",
    cek_login_is_admin,
    upload.fields([
      { name: "dokumen", maxCount: 1 },
      { name: "built_drawing", maxCount: 1 },
      { name: "dokumentasi", maxCount: 1 },
    ]),
    cek_login_is_admin,
    function (req, res) {
      var post = {};
      post = req.body;
      if (req.files) {
        if (req.files.dokumen) {
          const nama_file = req.files.dokumen[0].filename;
          post.dokumen = nama_file;
           resize(nama_file)
  
        }
        if (req.files.built_drawing) {
          const nama_file = req.files.built_drawing[0].filename;
          post.built_drawing = nama_file;
           resize(nama_file)
  
        }
        if (req.files.dokumentasi) {
          const nama_file = req.files.dokumentasi[0].filename;
          post.dokumentasi = nama_file;
           resize(nama_file)
  
        }
      }
      post.deleted = 0;
      sql_enak("pho")
        .insert(post)
        .then(function (id) {
          res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
        });
    });

  router.get(
    "/pekerjaan/delete_pho/:id/:idPekerjaan",
    cek_login_is_admin,
    function (req, res) {
      sql_enak("pho")
        .where("id", "=", req.params.id)
        .update({
          deleted: 1,
          thisKeyIsSkipped: undefined,
        })
        .then(function (params) { });
      res.redirect("/administrator/pekerjaan/monev/" + req.params.idPekerjaan);
    });
    router.post(
      "/pekerjaan/submit_fho",
      cek_login_is_admin,
      upload.fields([
        { name: "dokumen", maxCount: 1 },
        { name: "dokumentasi", maxCount: 1 },
      ]),
      cek_login_is_admin,
      function (req, res) {
        var post = {};
        post = req.body;
        if (req.files) {
          if (req.files.dokumen) {
            const nama_file = req.files.dokumen[0].filename;
            post.dokumen = nama_file;
             resize(nama_file)
    
          }

          if (req.files.dokumentasi) {
            const nama_file = req.files.dokumentasi[0].filename;
            post.dokumentasi = nama_file;
             resize(nama_file)
    
          }
        }
        post.deleted = 0;
        sql_enak("fho")
          .insert(post)
          .then(function (id) {
            res.redirect("/administrator/pekerjaan/monev/" + req.body.pekerjaanId);
          });
      });
    router.get(
      "/pekerjaan/delete_fho/:id/:idPekerjaan",
      cek_login_is_admin,
      function (req, res) {
        sql_enak("fho")
          .where("id", "=", req.params.id)
          .update({
            deleted: 1,
            thisKeyIsSkipped: undefined,
          })
          .then(function (params) { });
        res.redirect("/administrator/pekerjaan/monev/" + req.params.idPekerjaan);
      });


      router.post(`/update_uji_coba` ,
      //  upload.fields([
      //   { name: "berita_acara", maxCount: 1 },
      //   { name: "foto1", maxCount: 1 },
      //   { name: "foto2", maxCount: 1 },
      // ]),
      function (req, res) {
        var post = {};
        //   if (req.files) {
        //   if (req.files.berita_acara) {
        //     const nama_file = req.files.berita_acara[0].filename;
        //     post.berita_acara = nama_file;
        //     resize(nama_file)
        //   }
        //   if (req.files.foto1) {
        //     const nama_file = req.files.foto1[0].filename;
        //     post.foto1 = nama_file;
        //     resize(nama_file)
      
        //   }
        //   if (req.files.foto2) {
        //     const nama_file = req.files.foto2[0].filename;
        //     post.foto2 = nama_file;
        //      resize(nama_file)
        //   }
        // }
        // post.deleted = 0;
     connection.query(`UPDATE uji_coba SET  status=${req.body.status}, keterangan_admin='${req.body.keterangan_admin}' WHERE id=${req.body.id};`,function (err,rows,fields) {
      res.redirect(`/administrator/pekerjaan/monev/${req.body.pekerjaanId}`)
     })
  })
module.exports = router;
