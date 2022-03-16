-- phpMyAdmin SQL Dump
-- version 4.0.10deb1
-- http://www.phpmyadmin.net
--
-- Inang: localhost:3306
-- Waktu pembuatan: 20 Feb 2018 pada 08.23
-- Versi Server: 5.6.33-0ubuntu0.14.04.1
-- Versi PHP: 5.5.9-1ubuntu4.19

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Basis data: `air_bersih_kendal`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `user`
--

CREATE TABLE IF NOT EXISTS `user` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL DEFAULT '',
  `pwd` varchar(100) NOT NULL,
  `is_admin` int(11) NOT NULL,
  `id_kabupaten` int(11) NOT NULL DEFAULT '0',
  `fullname` varchar(255) DEFAULT '',
  `NIP` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telp` varchar(100) DEFAULT NULL,
  `last_login` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `created_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `updated` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  `batas` int(11) NOT NULL DEFAULT '0',
  `isok` tinyint(1) NOT NULL DEFAULT '0',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=14 ;

--
-- Dumping data untuk tabel `user`
--

INSERT INTO `user` (`id_user`, `username`, `pwd`, `is_admin`, `id_kabupaten`, `fullname`, `NIP`, `email`, `telp`, `last_login`, `created_date`, `updated`, `batas`, `isok`, `deleted`) VALUES
(1, 'admin', 'd033e22ae348aeb5660fc2140aec35850c4da997', 1, 0, 'admin', 'admin12345', 'admin@email.com', '12345', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '2015-10-04 15:07:51', 0, 0, 0),
(9, 'danang', 'f99aecef3d12e02dcbb6260bbdd35189c89e6e73', 0, 0, 'Danang Soeko R', '-', 'danangsoekoraharjo@gmail.com', '-', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '2018-01-03 07:18:18', 0, 0, 1),
(10, 'bhagas', '8fcdfa57d547a0e7851dc95edf3d90e21dc4bcdd', 0, 0, 'bhagas koro', '', '', '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, 0),
(11, 'superadmin', '889a3a791b3875cfae413574b53da4bb8a90d53e', 0, 0, 'superadmin', '-', '-', '-', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, 0),
(12, 'superadmin2', 'e5d7106a4999b241c3504d5acd441763a1fdefeb', 0, 0, 'superadmin2', '-', '-', '-', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, 0),
(13, 'testedit', 'da39a3ee5e6b4b0d3255bfef95601890afd80709', 0, 0, 'test edit', 'test', 'test', 'test', '0000-00-00 00:00:00', '0000-00-00 00:00:00', '2018-02-20 01:22:30', 0, 0, 1);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
