import { seedSman1NgoroPdfDigitalTwin } from "./seed_sman1_ngoro_pdf_map.mjs";

const dataset = await seedSman1NgoroPdfDigitalTwin();
console.log(
  `Seeded SMAN 1 Ngoro PDF Digital Twin (${dataset.map.id}: ${dataset.map.width}x${dataset.map.height}, ${dataset.rooms.length} rooms, ${dataset.scenarios.length} scenarios).`,
);
process.exit(0);
