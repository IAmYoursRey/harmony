import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error("DATABASE_URL or POSTGRES_URL is missing. Please set it in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

export async function runMigration() {
  console.log("=== Harmony PostGIS Spatial Database Migration ===");

  const client = await pool.connect();
  try {
    // 1. Enable PostGIS
    console.log("Enabling PostGIS extension...");
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");

    const versionRes = await client.query("SELECT PostGIS_Version();");
    console.log(`PostGIS initialized: ${versionRes.rows[0].postgis_version}`);

    // 2. Create spatial tables
    console.log("Creating normalized domain spatial tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS spatial_datasets (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        crs VARCHAR(50) DEFAULT 'EPSG:4326',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS spatial_features (
        id VARCHAR(255) PRIMARY KEY,
        dataset_id VARCHAR(255) REFERENCES spatial_datasets(id) ON DELETE CASCADE,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        geom geometry(Geometry, 4326),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_spatial_features_geom ON spatial_features USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_spatial_features_dataset ON spatial_features(dataset_id);

      CREATE TABLE IF NOT EXISTS sensor_stations (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        family VARCHAR(100) NOT NULL,
        platform VARCHAR(100),
        provider VARCHAR(255),
        geom geometry(Point, 4326) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sensor_stations_geom ON sensor_stations USING GIST (geom);

      CREATE TABLE IF NOT EXISTS sensor_observations (
        id VARCHAR(255) PRIMARY KEY,
        station_id VARCHAR(255) REFERENCES sensor_stations(id) ON DELETE CASCADE,
        parameter VARCHAR(100) NOT NULL,
        value NUMERIC,
        unit VARCHAR(50),
        quality VARCHAR(50) DEFAULT 'VALID',
        uncertainty NUMERIC,
        observed_at TIMESTAMP NOT NULL,
        geom geometry(Point, 4326),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sensor_observations_geom ON sensor_observations USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_sensor_observations_station ON sensor_observations(station_id);
      CREATE INDEX IF NOT EXISTS idx_sensor_observations_time ON sensor_observations(observed_at);

      CREATE TABLE IF NOT EXISTS hazard_zones (
        id VARCHAR(255) PRIMARY KEY,
        hazard_type VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        risk_level VARCHAR(50) NOT NULL,
        source_agency VARCHAR(100),
        geom geometry(MultiPolygon, 4326) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hazard_zones_geom ON hazard_zones USING GIST (geom);

      CREATE TABLE IF NOT EXISTS field_surveys (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        geom geometry(Geometry, 4326) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_field_surveys_geom ON field_surveys USING GIST (geom);
    `);

    console.log("Spatial tables and GiST indexes created successfully.");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith("002_postgis_spatial_core.js")) {
  runMigration()
    .then(() => {
      console.log("Migration finished.");
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
