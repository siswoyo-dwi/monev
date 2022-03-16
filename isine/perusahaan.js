var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , path = require('path')
  , sha1 = require('sha1');
var sql_enak = require('../database/mysql_enak.js').connection;
var cek_login = require('./login').cek_login;
var cek_login_google = require('./login').cek_login_google;
var dbgeo = require("dbgeo");
var multer = require("multer");
var st = require('knex-postgis')(sql_enak);
path.join(__dirname, '/public/foto')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
var moment = require("moment");
let nodemailer = require("nodemailer")
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
    cb(null, 'public/foto/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({ storage: storage })

//start-------------------------------------
router.get('/pekerjaan_konsultan/:id', async function (req, res) {
  console.log(req.params.id,'konsultan/id');

  const data = await sql_enak.raw(`SELECT * , pekerjaan.id as pekerjaanId,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak  from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id where pekerjaan.deleted =0 and pekerjaan.id = '${req.params.id}' `)
  const peringatan = await sql_enak.raw(`select *,DATE_FORMAT(peringatan.tanggal, '%d-%m-%Y')  as tanggal from peringatan where deleted = 0 and pekerjaanId = ${data[0][0].pekerjaanId}`)
  res.render('content/pekerjaan_konsultan', { data: data[0], peringatan: peringatan[0] });
});

router.get('/pekerjaan_konsultan/monev/:id', async function (req, res) {
  console.log(req.params.id,'/konsultan-monev');

  const data = await sql_enak.raw(
    `SELECT *,pekerjaan.id as pekerjaanId ,perusahaan.namaPerusahaan as namaPerusahaan, perusahaan.id as perusahaanId,DATE_FORMAT(tanggalSpmk, '%d-%m-%Y') as  tanggalSpmk ,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak  from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id INNER JOIN master_kelurahan mk ON mk.id_kelurahan =kelurahanId INNER JOIN master_kecamatan mk2 on mk2.id_kecamatan = kecamatanId where pekerjaan.id=${req.params.id}`
  );
  const termin = await sql_enak.raw(
    `SELECT *,DATE_FORMAT( termin.tanggalPembayaran ,'%d-%m-%Y') as tanggalPembayaran  FROM termin where pekerjaanId = ${req.params.id} and deleted =0 `
  );
  const uji_coba = await sql_enak.raw(`SELECT *,DATE_FORMAT(uc.tanggal,'%d-%m-%Y') as tanggal FROM uji_coba uc WHERE pekerjaanId = ${req.params.id} and deleted = 0 `)
  console.log(uji_coba[0],'uji coba');
  const datenow = moment().format("YYYY-MM-DD");
  const konsultan = await sql_enak.raw(`select * from laporan_konsultan where deleted = 0 and  pekerjaanId = ${req.params.id}`)
  const peringatan = await sql_enak.raw(
    `SELECT *, DATE_FORMAT( peringatan.tanggal ,'%d-%m-%Y') as tanggal FROM peringatan WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`);
  res.render('content/monev_pekerjaan_konsultan', { data: data[0], termin: termin[0], konsultan: konsultan[0], peringatan: peringatan[0],datenow ,uji_coba:uji_coba[0]});
});

router.post(
  "/pekerjaan/submit_pengajuan_termin",
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
    { name: "sts_denda", maxCount: 1 },
    { name: "surat_permohonan", maxCount: 1 },
  ]),
  async function (req, res) {
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
    post.status = 'Terkirim'
    post.deleted = 0;
    await  sql_enak("termin")
      .insert(post)
      .then( async function (id) {
      await  sql_enak("pekerjaan")
      .where("id", req.body.pekerjaanId)
      .update({
        status: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (id) { })
      .finally(function () {
        res.redirect("/perusahaan/pekerjaan_konsultan/monev/" + req.body.pekerjaanId);
      });
    });
  }
);
// router.post(
//   "/pekerjaan/submit_revisi_termin",
//   upload.fields([
//     { name: "beritaAcara", maxCount: 1 },
//     { name: "dokumentasi", maxCount: 1 },
//   ]),
//   function (req, res) {
//     var post = {};
//     console.log(req.body);
//     post = req.body;
//     if (req.files) {
//       if (req.files.beritaAcara) {
//         const nama_file = req.files.beritaAcara[0].filename;
//         post.beritaAcara = nama_file;
//       }
//       if (req.files.dokumentasi) {
//         const nama_file = req.files.dokumentasi[0].filename;
//         post.dokumentasi = nama_file;
//       }
//     }
//     sql_enak("termin")
//       .where("id", req.body.id)
//       .update(post)
//       .then(function (id) { })
//       .finally(function () {
//         res.redirect("/perusahaan/pekerjaan/monev/" + req.body.pekerjaanId);
//       });
//   });
router.get(
  "/pekerjaan/delete_termin_konsultan/:id/:idPekerjaan",
  function (req, res) {
    sql_enak("termin")
      .where("id", "=", req.params.id)
      .update({
        deleted: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (params) { });
    res.redirect("/perusahaan/pekerjaan_konsultan/monev/" + req.params.idPekerjaan);
  }
);
router.get('/pekerjaan/:pin', async function (req, res) {

  const data = await sql_enak.raw(`SELECT * , pekerjaan.id as pekerjaanId,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak  from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id where pekerjaan.pin='${req.params.pin}'  `)
  if (data[0].length && data[0][0].jenisPekerjaan == 'kontraktor') {
    // res.render("content/pekerjaan_perusahaan", {
    //   data: data[0]
    // });
    console.log(data[0][0]);
    res.redirect('/perusahaan/pekerjaan/monev/' + data[0][0].pekerjaanId)

  } else if (data[0][0].jenisPekerjaan == 'konsultan') {
    res.redirect('/perusahaan/pekerjaan_konsultan/monev/' + data[0][0].pekerjaanId)
  } else {
    res.redirect("/");
  }
});
router.post(
  "/pekerjaan/submit_laporan_mingguan_pekerjaan",
  upload.fields([
    { name: "fileLaporan", maxCount: 1 },
    { name: "foto1", maxCount: 1 },
    { name: "foto2", maxCount: 1 },
    { name: "foto3", maxCount: 1 },
    { name: "foto4", maxCount: 1 },
  ]),
  async function (req, res) {
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
    let perusahaanId = await sql_enak.raw(`SELECT p2.emailDirektur FROM pekerjaan p join perusahaan p2 on p.perusahaanId = p2.id WHERE p.id =${req.body.pekerjaanId}`)
    if (req.body.target > req.body.progress) {
      let transporter = await nodemailer.createTransport({
        service:'gmail',
        auth:{
          user:'noreply@survplus.id',
          pass:'Survplus132'
        }
      })
      let mailOption = await {
        from:'noreply@survplus.id',
        to:'reikirayuki@gmail.com',
        // to:perusahaanId[0].emailDirektur,
        subject:'peringatan target',
        text:`target mingguan kurang -${req.body.target - req.body.progress} % dari target.`
      }
      transporter.sendMail(mailOption,(err,data)=>{
        if (err) {
          res.json({err})
        } else {
          console.log('sukses!');
        }
      })
    }
    post.deleted = 0;
    await sql_enak("laporan_mingguan")
      .where("id", req.body.id)
      .update(post)
      .then(async function (id) {
        console.log(req.body.pekerjaanId , 'req.body.pekerjaanId');
       await sql_enak("pekerjaan")
        .where("id","=", req.body.pekerjaanId)
        .update({
          status: 1,
          thisKeyIsSkipped: undefined,
        })
      }).finally(function () {
        res.redirect("/perusahaan/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  }
);
router.post(
  "/pekerjaan/submit_termin_pekerjaan",
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
    { name: "sts_denda", maxCount: 1 },
    { name: "surat_permohonan", maxCount: 1 },
  ]),
 async function (req, res) {
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
  await  sql_enak("termin")
      .insert(post)
      .then( async function (id) {
      await  sql_enak("pekerjaan")
        .where("id", "=",req.body.pekerjaanId)
        .update({
          status: 1,
          thisKeyIsSkipped: undefined,
        })
        .then(function (id) { })
        .finally(function () {
          res.redirect("/perusahaan/pekerjaan/monev/" + req.body.pekerjaanId);
        });
      });
  }
);

router.post(`/pekerjaan_konsultan/input_uji_coba` , upload.fields([
  { name: "berita_acara", maxCount: 1 },
  { name: "foto1", maxCount: 1 },
  { name: "foto2", maxCount: 1 },
]),function (req, res) {
  console.log(req.body, 'body', req.files);
  var post = {};
  post = req.body;
    if (req.files) {
    if (req.files.berita_acara) {
      const nama_file = req.files.berita_acara[0].filename;
      post.berita_acara = nama_file;
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
  }
  post.deleted = 0;
  post.status = 0;

  sql_enak("uji_coba")
    .insert(post)
    .then(function (id) {
      res.redirect(`/perusahaan/pekerjaan_konsultan/monev/${req.body.pekerjaanId}`)
    });
})
router.post(`/pekerjaan/input_uji_coba`, upload.fields([
  { name: "berita_acara", maxCount: 1 },
  { name: "foto1", maxCount: 1 },
  { name: "foto2", maxCount: 1 },
]),function (req, res) {
  console.log(req.body, 'body', req.files);
  var post = {};
  post = req.body;
  if (req.files) {
    if (req.files.berita_acara) {
      const nama_file = req.files.berita_acara[0].filename;
      post.berita_acara = nama_file;
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
  }
  post.deleted = 0;
  post.status = 0;

  sql_enak("uji_coba")
    .insert(post)
    .then(function (id) {
      res.redirect(`/perusahaan/pekerjaan/monev/${req.body.pekerjaanId}`)
    });

})
router.get('/pekerjaan/monev/:id', async function (req, res) {
  console.log(req.params.id,'monev/id');
  const data = await sql_enak.raw(
    `SELECT *,pekerjaan.id as pekerjaanId , perusahaan.id as perusahaanId,DATE_FORMAT(tanggalSpmk, '%d-%m-%Y') as  tanggalSpmk ,DATE_FORMAT(pekerjaan.mulaiKontrak, '%d-%m-%Y')  as mulaiKontrak ,DATE_FORMAT(pekerjaan.akhirKontrak, '%d-%m-%Y') as akhirKontrak  from pekerjaan INNER JOIN perusahaan ON pekerjaan.perusahaanId=perusahaan.id INNER JOIN master_kelurahan mk ON mk.id_kelurahan =kelurahanId INNER JOIN master_kecamatan mk2 on mk2.id_kecamatan = kecamatanId where pekerjaan.id=${req.params.id}`
  );
  const termin = await sql_enak.raw(
    `SELECT *,DATE_FORMAT( termin.tanggalPembayaran ,'%d-%m-%Y') as tanggalPembayaran  FROM termin where pekerjaanId = ${req.params.id} and deleted =0 `
  );
  const laporan_mingguan = await sql_enak.raw(
    `SELECT *,DATE_FORMAT( lm.tanggal ,'%Y-%m-%d') as tanggal FROM laporan_mingguan lm WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
  );
  const target_mingguan=await sql_enak.raw(`SELECT * FROM target_mingguan tm WHERE pekerjaanId =  ${req.params.id}`)
  const adendum = await sql_enak.raw(
    `SELECT *,DATE_FORMAT( adendum.tanggal ,'%d-%m-%Y') as tanggal   FROM adendum WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`
  );
  const pengendalian = await sql_enak.raw(
    `SELECT *, DATE_FORMAT( pengendalianPengawasan.tanggal ,'%d-%m-%Y') as tanggal FROM pengendalianPengawasan WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`);
  const peringatan = await sql_enak.raw(
    `SELECT *, DATE_FORMAT( peringatan.tanggal ,'%d-%m-%Y') as tanggal FROM peringatan WHERE deleted = 0 AND pekerjaanId = ${req.params.id}`);
  const laporanBulanan = await sql_enak.raw(`select * from laporan_bulanan where deleted = 0 and pekerjaanId = ${req.params.id}`)
  const uji_coba = await sql_enak.raw(`SELECT *,DATE_FORMAT(uc.tanggal,'%d-%m-%Y') as tanggal FROM uji_coba uc WHERE pekerjaanId = ${req.params.id} and deleted = 0 `)
  console.log(uji_coba[0],'uji coba');

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
  res.render('content/monev_pekerjaan_perusahaan', {
    data: data[0],
    termin: termin[0],
    laporanBulanan: laporanBulanan[0],
    laporan_mingguan: laporan_mingguan[0],
    pengendalian: pengendalian[0],
    peringatan: peringatan[0],
    adendum: adendum[0],
    datenow: datenow,
    dateArray: dateArray,
    deadline: deadline,
    uji_coba:uji_coba[0],
    target_mingguan:target_mingguan[0]
  });
});
router.post(
  "/pekerjaan/submit_revisi_termin",
  upload.fields([
    { name: "beritaAcara", maxCount: 1 },
    { name: "dokumentasi", maxCount: 1 },
    { name: "sts_denda", maxCount: 1 },
    { name: "surat_permohonan", maxCount: 1 },
  ]),
  function (req, res) {
    console.log('hai,hai,hai');
    var post = {};
    post = req.body;
    if (req.files) {
      if (req.files.beritaAcara) {
        const nama_file = req.files.beritaAcara[0].filename;
        post.beritaAcara = nama_file;
      }
      if (req.files.dokumentasi) {
        const nama_file = req.files.dokumentasi[0].filename;
        post.dokumentasi = nama_file;
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
      post.status = 'termin telah direvisi oleh user'
    sql_enak("termin")
    .where("id", "=", req.body.id)
    .update(post)
    
    .then( async function (id) {
      await  sql_enak("pekerjaan")
      .where("id", req.body.pekerjaanId)
      .update({
        status: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (id) { })
      .finally(function () {
      
        res.redirect("/perusahaan/pekerjaan/monev/" + req.body.pekerjaanId);
        })
      });
  });
  router.post(
    "/pekerjaan/submit_revisi_termin_konsultan",
    upload.fields([
      { name: "beritaAcara", maxCount: 1 },
      { name: "dokumentasi", maxCount: 1 },
    ]),
    function (req, res) {
      var post = {};
      post = req.body;
      if (req.files) {
        if (req.files.beritaAcara) {
          const nama_file = req.files.beritaAcara[0].filename;
          post.beritaAcara = nama_file;
        }
        if (req.files.dokumentasi) {
          const nama_file = req.files.dokumentasi[0].filename;
          post.dokumentasi = nama_file;
        }
      }
        post.status = 'termin telah direvisi oleh user'
      sql_enak("termin")
      .where("id", "=", req.body.id)
      .update(post)
      .then( async function (id) {
        await  sql_enak("pekerjaan")
        .where("id", req.body.pekerjaanId)
        .update({
          status: 1,
          thisKeyIsSkipped: undefined,
        })
        .then(function (id) { })
        .finally(function () {
            res.redirect("/perusahaan/pekerjaan_konsultan/monev/" + req.body.pekerjaanId);
          })
        });
    });
router.get(
  "/pekerjaan/delete_termin/:id/:idPekerjaan",
  function (req, res) {
    sql_enak("termin")
      .where("id", "=", req.params.id)
      .update({
        deleted: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (params) { });
    res.redirect("/perusahaan/pekerjaan/monev/" + req.params.idPekerjaan);
  }
);

router.post(
  "/pekerjaan/submit_laporan_bulanan_pekerjaan",
  upload.fields([
    { name: "fileLaporan", maxCount: 1 },
    { name: "foto1", maxCount: 1 },
    { name: "foto2", maxCount: 1 },
    { name: "foto3", maxCount: 1 },
    { name: "foto4", maxCount: 1 },
  ]),
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
        res.redirect("/perusahaan/pekerjaan/monev/" + req.body.pekerjaanId);
      });
  });

  router.post(
    "/pekerjaan/submit_edit_pekerjaan",
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
      console.log(req.body , 'body');
      sql_enak("pekerjaan")
        .where("id", "=", req.body.id)
        .update(post)
        .then(function (id) { });
      // res.redirect("/administrator/pekerjaan/edit/" + req.body.id);
        res.redirect("/perusahaan/pekerjaan/monev/" + req.body.id);
    }
  );
  
  router.post(
    "/pekerjaan_konsultan/submit_edit_pekerjaan",
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
      console.log(req.body , 'body');
      sql_enak("pekerjaan")
        .where("id", "=", req.body.id)
        .update(post)
        .then(function (id) { });
      // res.redirect("/administrator/pekerjaan/edit/" + req.body.id);
        res.redirect("/perusahaan/pekerjaan_konsultan/monev/" + req.body.id);
    }
  );
router.get(
  "/pekerjaan/delete_laporan_bulanan/:id/:idPekerjaan",
  function (req, res) {
    sql_enak("laporan_bulanan")
      .where("id", "=", req.params.id)
      .update({
        deleted: 1,
        thisKeyIsSkipped: undefined,
      })
      .then(function (params) { });
    res.redirect("/perusahaan/pekerjaan/monev/" + req.params.idPekerjaan);
  });

router.post(
  "/pekerjaan/submit_laporan_konsultan",
  upload.fields([
    { name: "fileLaporan", maxCount: 1 },
    { name: "foto1", maxCount: 1 },
    { name: "foto2", maxCount: 1 },
    { name: "foto3", maxCount: 1 },
    { name: "foto4", maxCount: 1 },
  ]),
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
      .where("id", req.body.id)
      .update(post)
      .then(function (id) {
        res.redirect("/perusahaan/pekerjaan_konsultan/monev/" + req.body.pekerjaanId);
      });
  });

  router.get(
    "/pekerjaan/delete_uji_coba/:id/:idPekerjaan",
    function (req, res) {
      sql_enak("uji_coba")
        .where("id", "=", req.params.id)
        .update({
          deleted: 1,
          thisKeyIsSkipped: undefined,
        })
        .then(function (params) { });
      res.redirect("/perusahaan/pekerjaan/monev/" + req.params.idPekerjaan);
    }
  );
  router.get(
    "/pekerjaan_konsultan/delete_uji_coba/:id/:idPekerjaan",
    function (req, res) {
      sql_enak("uji_coba")
        .where("id", "=", req.params.id)
        .update({
          deleted: 1,
          thisKeyIsSkipped: undefined,
        })
        .then(function (params) { });
      res.redirect("/perusahaan/pekerjaan_konsultan/monev/" + req.params.idPekerjaan);
    }
  );

router.post(`/pekerjaan/inputTargetMingguan/:id`, async function (req, res) {
  // let x = 1 
  // for (let i in req.body) {
  //   if (req.body[i+1]!=undefined) {
  //     console.log(req.body[i]<req.body[i+1],req.body[i],req.body[i+1]);

  //     if (req.body[i]<req.body[i+1]) {
  //       x=0
  //     }
  //   }
   
  // }
  // let index = -1
  console.log(req.body,'body');
  // if (x==0) {
    // for (let i in req.body) {
    //   let post = {}
    //   post.periode = index+=1
    //   post.pekerjaanId = req.params.id
    //   post.target = req.body[i]
    // await  sql_enak("target_mingguan").insert(post)
    // }
    let arr = req.body.data
    for (let i = 0; i < arr.length; i++) {
            let post = {}
      post.periode = i
      post.pekerjaanId = req.params.id
      post.target =arr[i]
      console.log(post);
    await  sql_enak("target_mingguan").insert(post)
    }
    // res.redirect("/perusahaan/pekerjaan/monev/" + req.params.id);
  // } 
  // else {
  //   res.redirect("/perusahaan/pekerjaan/monev/" + req.params.id);
    
  // }
  
})
router.post(`/update_akhir_kontrak`,async function (req,res) {
  await sql_enak("pekerjaan")
    .where("id", "=", req.body.id)
    .update({
      akhirKontrak: req.body.akhirKontrak,
      thisKeyIsSkipped: undefined,
    })
    .then(function (id) { 
       res.redirect("/perusahaan/pekerjaan/monev/"+req.body.id);
  });
})
module.exports = router;
