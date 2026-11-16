import pg from "pg";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
import { buildSman1NgoroPdfDigitalTwin } from "../apps/server/src/data/sman1NgoroPdfMapBuilder.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function createClient() {
  return new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false },
  });
}

async function batchInsertTiles(client, tiles) {
  const BATCH_SIZE = 500;
  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const chunk = tiles.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    chunk.forEach((tile, idx) => {
      const base = idx * 8;
      values.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`,
      );
      params.push(
        tile.id,
        tile.floor_id,
        tile.x,
        tile.y,
        tile.tile_type,
        tile.rotation,
        tile.variant,
        tile.metadata ? JSON.stringify(tile.metadata) : null,
      );
    });
    await client.query(
      `INSERT INTO digital_twin_tiles (id, floor_id, x, y, tile_type, rotation, variant, metadata)
       VALUES ${values.join(", ")}`,
      params,
    );
  }
}

export async function seedSman1NgoroPdfDigitalTwin() {
  const dataset = buildSman1NgoroPdfDigitalTwin();
  const client = createClient();
  await client.connect();

  try {
    await client.query("BEGIN");

    const { map, floors, tiles, rooms, boundaries, objects, scenarios } = dataset;

    await client.query(
      `INSERT INTO digital_twin_maps (
        id, school_id, name, description, width, height, active_floor_id,
        status, version, border, is_public, author_name, school_name, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        active_floor_id = EXCLUDED.active_floor_id,
        status = EXCLUDED.status,
        version = EXCLUDED.version,
        border = EXCLUDED.border,
        is_public = EXCLUDED.is_public,
        author_name = EXCLUDED.author_name,
        school_name = EXCLUDED.school_name,
        updated_at = NOW()`,
      [
        map.id,
        map.school_id,
        map.name,
        map.description,
        map.width,
        map.height,
        map.active_floor_id,
        map.status,
        map.version,
        JSON.stringify(map.border),
        map.is_public,
        map.author_name,
        map.school_name,
      ],
    );

    const floorIds = floors.map((f) => f.id);
    await client.query(
      `DELETE FROM digital_twin_tiles WHERE floor_id = ANY($1)`,
      [floorIds],
    );
    await client.query(
      `DELETE FROM digital_twin_objects WHERE floor_id = ANY($1)`,
      [floorIds],
    );
    await client.query(
      `DELETE FROM digital_twin_boundaries WHERE map_id = $1`,
      [map.id],
    );
    await client.query(
      `DELETE FROM digital_twin_rooms WHERE map_id = $1`,
      [map.id],
    );
    await client.query(
      `DELETE FROM digital_twin_floors WHERE map_id = $1`,
      [map.id],
    );

    for (const f of floors) {
      await client.query(
        `INSERT INTO digital_twin_floors (id, map_id, floor_number, name, width, height, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [f.id, f.map_id, f.floor_number, f.name, f.width, f.height],
      );
    }

    await batchInsertTiles(client, tiles);

    for (const r of rooms) {
      await client.query(
        `INSERT INTO digital_twin_rooms (
          id, map_id, floor_id, name, type, x, y, width, height, capacity, metadata, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          r.id,
          r.map_id,
          r.floor_id,
          r.name,
          r.type,
          r.x,
          r.y,
          r.width,
          r.height,
          r.capacity,
          JSON.stringify(r.metadata),
        ],
      );
    }

    for (const b of boundaries) {
      await client.query(
        `INSERT INTO digital_twin_boundaries (id, map_id, floor_id, geometry, closed, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [b.id, b.map_id, b.floor_id, JSON.stringify(b.geometry), b.closed],
      );
    }

    for (const obj of objects) {
      await client.query(
        `INSERT INTO digital_twin_objects (
          id, floor_id, object_type, x, y, width, height, rotation, properties, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          obj.id,
          obj.floor_id,
          obj.object_type,
          obj.x,
          obj.y,
          obj.width,
          obj.height,
          obj.rotation,
          JSON.stringify(obj.properties),
        ],
      );
    }

    for (const sc of scenarios) {
      await client.query(
        `INSERT INTO digital_twin_scenarios (id, map_id, name, disaster_type, status, version, config, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           map_id = EXCLUDED.map_id,
           name = EXCLUDED.name,
           disaster_type = EXCLUDED.disaster_type,
           status = EXCLUDED.status,
           version = EXCLUDED.version,
           config = EXCLUDED.config,
           updated_at = NOW()`,
        [
          sc.id,
          sc.map_id,
          sc.name,
          sc.disaster_type,
          sc.status,
          sc.version,
          JSON.stringify(sc.config),
        ],
      );

      await client.query(
        `DELETE FROM digital_twin_scenario_objects WHERE scenario_id = $1`,
        [sc.id],
      );

      for (const obj of sc.objects) {
        await client.query(
          `INSERT INTO digital_twin_scenario_objects (
            id, scenario_id, floor_id, object_type, x, y, width, height, rotation, properties
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            obj.id,
            obj.scenario_id,
            obj.floor_id,
            obj.object_type,
            obj.x,
            obj.y,
            obj.width,
            obj.height,
            obj.rotation,
            JSON.stringify(obj.properties),
          ],
        );
      }
    }

    // Synchronize legacy grid_maps and simulations JSONB tables inside the same transaction
    await client.query(
      `INSERT INTO grid_maps (id, data)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [dataset.legacyGridMap.id, JSON.stringify(dataset.legacyGridMap)],
    );

    for (const sim of dataset.legacySimulations) {
      await client.query(
        `INSERT INTO simulations (id, data)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [sim.id, JSON.stringify(sim)],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end().catch(() => {});
  }

  return dataset;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const dataset = await seedSman1NgoroPdfDigitalTwin();
  console.log(
    JSON.stringify(
      {
        seeded: true,
        mapId: dataset.map.id,
        mapName: dataset.map.name,
        dimensions: `${dataset.map.width}x${dataset.map.height}`,
        tileCount: dataset.tiles.length,
        roomCount: dataset.rooms.length,
        scenarios: dataset.scenarios.map((s) => ({
          id: s.id,
          name: s.name,
          objectCount: s.objects.length,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
