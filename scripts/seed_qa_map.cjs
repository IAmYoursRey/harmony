require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      "SELECT map_id FROM digital_twin_scenarios WHERE id = 'scen_qa1'",
    );
    if (res.rows.length === 0) throw new Error("scen_qa1 not found");
    const mapId = res.rows[0].map_id;
    console.log("Found mapId:", mapId);

    await pool.query(
      `
      INSERT INTO digital_twin_floors (id, map_id, name, floor_number, width, height) 
      VALUES ('floor_qa_1', $1, 'Lantai 1 QA', 1, 64, 64)
      ON CONFLICT (id) DO UPDATE SET map_id = EXCLUDED.map_id
    `,
      [mapId],
    );

    await pool.query(
      `
      UPDATE digital_twin_maps SET active_floor_id = 'floor_qa_1' WHERE id = $1
    `,
      [mapId],
    );

    await pool.query(`
      INSERT INTO digital_twin_tiles (id, floor_id, x, y, tile_type)
      VALUES ('tile_qa_1', 'floor_qa_1', 32, 32, 'floor')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log("Seeded floor_qa_1 for map:", mapId);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
