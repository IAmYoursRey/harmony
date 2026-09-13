require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      "SELECT DISTINCT map_id FROM digital_twin_scenarios WHERE status='published'",
    );

    for (let row of res.rows) {
      const mapId = row.map_id;
      const floorId = `floor_${mapId}`;

      await pool.query(
        `
        INSERT INTO digital_twin_floors (id, map_id, name, floor_number, width, height) 
        VALUES ($1, $2, 'Lantai 1', 1, 64, 64)
        ON CONFLICT (id) DO NOTHING
      `,
        [floorId, mapId],
      );

      await pool.query(
        `
        UPDATE digital_twin_maps SET active_floor_id = $1 WHERE id = $2
      `,
        [floorId, mapId],
      );

      await pool.query(
        `
        INSERT INTO digital_twin_tiles (id, floor_id, x, y, tile_type)
        VALUES ($1, $2, 32, 32, 'floor')
        ON CONFLICT (id) DO NOTHING
      `,
        [`tile_${mapId}`, floorId],
      );

      console.log(`Seeded floor for map ${mapId}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
