module.exports.connection = require('knex')({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: 'Grafika9',
    database: '2022_monev_kegiatan'
  }
});