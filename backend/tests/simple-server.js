const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'membership_new',
  port: 3306
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Test endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Voting stations lookup endpoint
app.get('/api/v1/search/lookup/voting_stations', async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    let query = `
      SELECT
        vs.voting_station_id as id,
        vs.station_name as name,
        vs.station_code,
        vs.address,
        COUNT(m.member_id) as member_count
      FROM voting_stations vs
      LEFT JOIN members m ON vs.voting_station_id = m.voting_station_id
    `;

    const params = [];

    if (search) {
      query += ` WHERE vs.station_name LIKE ? OR vs.station_code LIKE ?`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` GROUP BY vs.voting_station_id, vs.station_name, vs.station_code, vs.address ORDER BY vs.station_name LIMIT ?`;
    params.push(parseInt(limit));

    const [results] = await pool.execute(query, params);

    res.json({
      success: true,
      message: 'voting_stations lookup data retrieved successfully',
      data: {
        results,
        type: 'voting_stations',
        count: results.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in voting stations lookup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voting stations'
    });
  }
});

// Lookup endpoints for search functionality
app.get('/api/v1/search/lookup/voting_districts', async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    let query = `
      SELECT
        vd.vd_code,
        vd.vd_name,
        vd.voting_district_number,
        COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON REPLACE(CAST(vd.vd_code AS CHAR), '.0', '') = REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '')
    `;

    const params = [];

    if (search) {
      query += ` WHERE vd.vd_name LIKE ? OR vd.vd_code LIKE ? OR vd.voting_district_number LIKE ?`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` GROUP BY vd.vd_code, vd.vd_name, vd.voting_district_number ORDER BY vd.vd_name LIMIT ?`;
    params.push(parseInt(limit));

    const [results] = await pool.execute(query, params);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error in voting districts lookup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voting districts'
    });
  }
});

app.get('/api/v1/search/lookup/voting_stations', async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    let query = `
      SELECT
        vs.voting_station_id,
        vs.station_name,
        vs.station_code,
        vs.address,
        COUNT(m.member_id) as member_count
      FROM voting_stations vs
      LEFT JOIN members m ON vs.voting_station_id = m.voting_station_id
    `;

    const params = [];

    if (search) {
      query += ` WHERE vs.station_name LIKE ? OR vs.station_code LIKE ?`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` GROUP BY vs.voting_station_id, vs.station_name, vs.station_code, vs.address ORDER BY vs.station_name LIMIT ?`;
    params.push(parseInt(limit));

    const [results] = await pool.execute(query, params);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error in voting stations lookup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voting stations'
    });
  }
});

// Members by voting district endpoint
app.get('/api/v1/search/members-by-voting-district/:votingDistrictCode', async (req, res) => {
  try {
    const { votingDistrictCode } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Get members in this voting district
    const query = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as cell_number,
        'Active' as membership_status,
        m.created_at as membership_date,
        vd.vd_name as voting_district_name,
        vd.voting_district_number,
        '' as ward_name,
        '' as ward_number,
        '' as municipality_name,
        '' as district_name,
        '' as province_name
      FROM members m
      LEFT JOIN voting_districts vd ON REPLACE(CAST(vd.vd_code AS CHAR), '.0', '') = REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '')
      WHERE REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(? AS CHAR), '.0', '')
      ORDER BY m.firstname, COALESCE(m.surname, '')
      LIMIT ? OFFSET ?
    `;

    const [members] = await pool.execute(query, [votingDistrictCode, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM members m
      WHERE REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(? AS CHAR), '.0', '')
    `;

    const [countResult] = await pool.execute(countQuery, [votingDistrictCode]);
    const total = countResult[0]?.total || 0;

    // Get voting district info
    const districtQuery = `
      SELECT
        vd.vd_code,
        vd.vd_name,
        vd.voting_district_number,
        '' as ward_name,
        '' as ward_number,
        '' as municipal_name,
        '' as district_name,
        '' as province_name
      FROM voting_districts vd
      WHERE REPLACE(CAST(vd.vd_code AS CHAR), '.0', '') = REPLACE(CAST(? AS CHAR), '.0', '')
      LIMIT 1
    `;

    const [districtResult] = await pool.execute(districtQuery, [votingDistrictCode]);
    const districtInfo = districtResult[0] || {};

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    res.json({
      success: true,
      data: {
        members,
        district_info: districtInfo,
        pagination
      }
    });

  } catch (error) {
    console.error('Error fetching members by voting district:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
      details: error.message
    });
  }
});

// Members by voting station endpoint
app.get('/api/v1/search/members-by-voting-station/:votingStationId', async (req, res) => {
  try {
    const { votingStationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Get members in this voting station
    const query = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as cell_number,
        'Active' as membership_status,
        m.created_at as membership_date,
        COALESCE(vs.station_name, 'Unknown') as voting_station_name,
        vs.station_code,
        COALESCE(vs.address, 'Address not available') as voting_station_address,
        '' as voting_district_name,
        '' as voting_district_number,
        '' as ward_name,
        '' as ward_number,
        '' as municipality_name,
        '' as district_name,
        '' as province_name
      FROM members m
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      WHERE m.voting_station_id = ?
      ORDER BY m.firstname, COALESCE(m.surname, '')
      LIMIT ? OFFSET ?
    `;

    const [members] = await pool.execute(query, [votingStationId, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM members m
      WHERE m.voting_station_id = ?
    `;

    const [countResult] = await pool.execute(countQuery, [votingStationId]);
    const total = countResult[0]?.total || 0;

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    res.json({
      success: true,
      data: {
        members,
        station_info: {
          vs_id: votingStationId,
          vs_name: members[0]?.voting_station_name || 'Unknown',
          address: members[0]?.voting_station_address || 'Address not available'
        },
        pagination
      }
    });

  } catch (error) {
    console.error('Error fetching members by voting station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
});
