import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

async function inspectPostGIS() {
  console.log("=== POSTGIS TABLES & ROW COUNT AUDIT ===");
  if (!connectionString) {
    console.error("DATABASE_URL is not defined in environment");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // 1. PostGIS Version and Extension Details
    const versionRes = await client.query("SELECT PostGIS_Full_Version() as full_version;");
    console.log("\n[1] PostGIS Extension:");
    console.log(versionRes.rows[0].full_version);

    // 2. Row counts across all relevant tables
    const tables = [
      'schools',
      'spatial_datasets',
      'spatial_features',
      'sensor_stations',
      'sensor_observations',
      'hazard_zones',
      'field_surveys'
    ];

    console.log("\n[2] Table Row Counts:");
    for (const table of tables) {
      try {
        const countRes = await client.query(`SELECT count(*) as count FROM ${table};`);
        console.log(`- ${table}: ${countRes.rows[0].count} rows`);
      } catch (err) {
        console.log(`- ${table}: ERROR (${err.message})`);
      }
    }

    // 3. GiST Spatial Indexes
    console.log("\n[3] Spatial GiST Indexes:");
    const indexQuery = `
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND indexdef ILIKE '%gist%';
    `;
    const indexRes = await client.query(indexQuery);
    if (indexRes.rows.length === 0) {
      console.log("No GiST indexes found.");
    } else {
      indexRes.rows.forEach(r => {
        console.log(`- ${r.tablename}.${r.indexname}: ${r.indexdef}`);
      });
    }

    // 4. Geometry Columns & SRID Validation
    console.log("\n[4] Geometry Columns Metadata:");
    const geomColQuery = `
      SELECT f_table_name, f_geometry_column, coord_dimension, srid, type
      FROM geometry_columns
      WHERE f_table_schema = 'public';
    `;
    const geomColRes = await client.query(geomColQuery);
    geomColRes.rows.forEach(r => {
      console.log(`- Table: ${r.f_table_name}, Column: ${r.f_geometry_column}, Dimension: ${r.coord_dimension}, SRID: ${r.srid}, Type: ${r.type}`);
    });

    client.release();
  } catch (err) {
    console.error("Database inspection error:", err);
  } finally {
    await pool.end();
  }
}

inspectPostGIS();
