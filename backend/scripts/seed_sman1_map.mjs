import { pool } from "../repository.js";
import crypto from "crypto";

const SMAN1_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

async function seedMap() {
  if (!pool) {
    console.error("Pool not available. Ensure DATABASE_URL is set.");
    return;
  }

  console.log("Seeding SMAN 1 Ngoro Map Template...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "ALTER TABLE digital_twin_maps ADD COLUMN IF NOT EXISTS border JSONB",
    );

    await client.query("DELETE FROM digital_twin_maps WHERE school_id=$1", [
      SMAN1_SCHOOL_ID,
    ]);

    const mapId = "map-sman1-ngoro-" + Date.now();
    const floorId = "floor-sman1-1-" + Date.now();

    const mapBorder = {
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 60,
      width: 101,
      height: 61,
    };

    await client.query(
      `INSERT INTO digital_twin_maps (id, school_id, name, description, width, height, active_floor_id, border)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        mapId,
        SMAN1_SCHOOL_ID,
        "SMAN 1 Ngoro",
        "Official Structural Layout Template",
        101,
        61,
        floorId,
        JSON.stringify(mapBorder),
      ],
    );

    await client.query(
      `INSERT INTO digital_twin_floors (id, map_id, floor_number, name) VALUES ($1, $2, $3, $4)`,
      [floorId, mapId, 1, "Lantai 1"],
    );

    const tiles = [];
    const rooms = [];

    const addRoom = (name, x, y, w, h, doors) => {
      rooms.push({
        id: crypto.randomUUID(),
        map_id: mapId,
        floor_id: floorId,
        name,
        type: "Classroom",
        x,
        y,
        width: w,
        height: h,
      });

      for (let tx = x; tx < x + w; tx++) {
        for (let ty = y; ty < y + h; ty++) {
          const isEdge =
            tx === x || tx === x + w - 1 || ty === y || ty === y + h - 1;
          const isDoor = doors.some((d) => tx === x + d.x && ty === y + d.y);

          if (isDoor) {
            tiles.push({
              id: crypto.randomUUID(),
              floor_id: floorId,
              x: tx,
              y: ty,
              tile_type: "DOOR",
            });
          } else if (isEdge) {
            tiles.push({
              id: crypto.randomUUID(),
              floor_id: floorId,
              x: tx,
              y: ty,
              tile_type: "WALL",
            });
          } else {
            tiles.push({
              id: crypto.randomUUID(),
              floor_id: floorId,
              x: tx,
              y: ty,
              tile_type: "FLOOR",
            });
          }
        }
      }
    };

    addRoom("Lab IPA 1", 5, 5, 10, 15, [{ x: 9, y: 7 }]);
    addRoom("Lab IPA 2", 5, 20, 10, 15, [{ x: 9, y: 7 }]);

    addRoom("Aula Utama", 20, 5, 30, 20, [
      { x: 15, y: 19 },
      { x: 10, y: 19 },
      { x: 20, y: 19 },
    ]);
    addRoom("Gudang Aula", 15, 15, 5, 10, [{ x: 4, y: 5 }]); // attached left
    addRoom("Ruang Guru", 50, 5, 15, 20, [{ x: 0, y: 10 }]); // attached right

    for (let i = 0; i < 3; i++) {
      addRoom(`Kelas 10-${i + 1}`, 70 + i * 8, 5, 8, 10, [{ x: 3, y: 9 }]);
      addRoom(`Kelas 11-${i + 1}`, 70 + i * 8, 15, 8, 10, [{ x: 3, y: 9 }]);
    }

    for (let cx = 15; cx < 95; cx++) {
      for (let cy = 25; cy < 30; cy++) {
        tiles.push({
          id: crypto.randomUUID(),
          floor_id: floorId,
          x: cx,
          y: cy,
          tile_type: "FLOOR",
          variant: 1,
        }); // paving variant or something
      }
    }

    addRoom("Ruang Staff", 45, 25, 8, 15, [{ x: 0, y: 5 }]);

    tiles.push({
      id: crypto.randomUUID(),
      floor_id: floorId,
      x: 49,
      y: 26,
      tile_type: "STAIR_UP",
    });

    addRoom("Perpustakaan", 5, 40, 15, 15, [{ x: 14, y: 5 }]);
    addRoom("UKS", 20, 40, 10, 10, [{ x: 5, y: 0 }]);

    addRoom("Kantin", 35, 40, 20, 15, [{ x: 10, y: 0 }]);

    for (let i = 0; i < 3; i++) {
      addRoom(`Kelas 12-${i + 1}`, 70 + i * 8, 40, 8, 10, [{ x: 3, y: 0 }]);
    }

    const chunkSize = 500;
    for (let i = 0; i < tiles.length; i += chunkSize) {
      const chunk = tiles.slice(i, i + chunkSize);
      let values = [];
      let queryStr =
        "INSERT INTO digital_twin_tiles (id, floor_id, x, y, tile_type, variant, rotation) VALUES ";

      chunk.forEach((t, idx) => {
        const offset = idx * 7;
        queryStr += `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})${idx === chunk.length - 1 ? "" : ","}`;
        values.push(
          t.id,
          t.floor_id,
          t.x,
          t.y,
          t.tile_type,
          t.variant || 0,
          t.rotation || 0,
        );
      });

      await client.query(queryStr, values);
    }

    for (const r of rooms) {
      await client.query(
        "INSERT INTO digital_twin_rooms (id, map_id, floor_id, name, type, x, y, width, height) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
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
        ],
      );
    }

    await client.query(
      "INSERT INTO digital_twin_stairs (id, map_id, from_floor_id, x, y, direction, type) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [crypto.randomUUID(), mapId, floorId, 49, 26, "N", "UP"],
    );

    await client.query("COMMIT");
    console.log("Seeding complete. Map created with ID:", mapId);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error seeding map:", err);
  } finally {
    client.release();
  }
}

seedMap().catch(console.error);
