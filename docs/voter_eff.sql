-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 17, 2025 at 04:28 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";




-- --------------------------------------------------------

--
-- Table structure for table `voter_eff`
--

CREATE TABLE `voter_registration_data` (
  `id` int(11) NOT NULL,
  `province` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `sub_region` varchar(100) DEFAULT NULL,
  `ward` varchar(50) DEFAULT NULL,
  `voting_district` varchar(100) DEFAULT NULL,
  `voting_district_id` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `name_surname` varchar(100) DEFAULT NULL,
  `voter_name` varchar(100) DEFAULT NULL,
  `voter_surname` varchar(100) DEFAULT NULL,
  `id_number` varchar(13) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `voting_for_eff` varchar(10) DEFAULT NULL,
  `isValidID` varchar(10) DEFAULT NULL,
  `verified_by_iec` varchar(20) DEFAULT NULL,
  `verification_message` text DEFAULT NULL,
  `verification_attempts` int(11) DEFAULT 0,
  `processing_started` timestamp NULL DEFAULT NULL,
  `status` varchar(50) DEFAULT 'New',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `voter_eff`
--
ALTER TABLE `voter_registration_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_voter_registration_data_id_number` (`id_number`),
  ADD KEY `idx_voter_registration_data_sub_region` (`sub_region`),
  ADD KEY `idx_voter_registration_data_status` (`status`),
  ADD KEY `idx_voter_registration_data_verification` (`verified_by_iec`,`verification_attempts`),
  ADD KEY `idx_voter_registration_data_processing` (`processing_started`,`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `voter_eff`
--
ALTER TABLE `voter_registration_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `voter_eff`
--
ALTER TABLE `voter_registration_data`
  ADD CONSTRAINT `voter_registration_data_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
