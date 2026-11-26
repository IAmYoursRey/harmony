import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outDir = path.resolve(process.cwd(), "tests/fixtures/geotiff");
fs.mkdirSync(outDir, { recursive: true });

function writeTiff({
  filename,
  width = 16,
  height = 16,
  littleEndian = true,
  compression = 1,
  predictor = 1,
  isTiled = false,
  pixelFn = () => 45000,
  tiepoint = [0, 0, 0, 112.0, -7.0, 0],
  pixelScale = [0.001, 0.001, 0],
  hasGeoreference = true,
  geoKeys = [1, 1, 0, 1, 2048, 0, 1, 4326],
  noData = null,
}) {
  const totalPixels = width * height;
  const rawBuf = Buffer.alloc(totalPixels * 2);

  for (let r = 0; r < height; r++) {
    let prev = 0;
    for (let c = 0; c < width; c++) {
      let val = pixelFn(c, r);
      if (predictor === 2) {
        const diff = c === 0 ? val : (val - prev) & 0xffff;
        prev = val;
        val = diff;
      }
      const offset = (r * width + c) * 2;
      if (littleEndian) rawBuf.writeUInt16LE(val & 0xffff, offset);
      else rawBuf.writeUInt16BE(val & 0xffff, offset);
    }
  }

  const imageData = compression === 8 ? zlib.deflateSync(rawBuf) : rawBuf;

  const entries = [];
  const addShort = (tag, v) => entries.push({ tag, type: 3, count: 1, val: v });
  const addLong = (tag, v) => entries.push({ tag, type: 4, count: 1, val: v });

  addLong(256, width);
  addLong(257, height);
  addShort(258, 16);
  addShort(259, compression);

  const dataOffset = 8;
  const paddedDataLen = imageData.length + (imageData.length % 2);
  let cursor = dataOffset + paddedDataLen;

  if (isTiled) {
    addLong(322, width);
    addLong(323, height);
    addLong(324, dataOffset);
    addLong(325, imageData.length);
  } else {
    addLong(273, dataOffset);
    addLong(278, height);
    addLong(279, imageData.length);
  }

  if (predictor !== 1) {
    addShort(317, predictor);
  }

  const extraBlocks = [];

  if (hasGeoreference) {
    const scaleBuf = Buffer.alloc(24);
    for (let i = 0; i < 3; i++) {
      if (littleEndian) scaleBuf.writeDoubleLE(pixelScale[i] || 0, i * 8);
      else scaleBuf.writeDoubleBE(pixelScale[i] || 0, i * 8);
    }
    entries.push({ tag: 33550, type: 12, count: 3, ptr: cursor });
    extraBlocks.push(scaleBuf);
    cursor += scaleBuf.length;

    const tieBuf = Buffer.alloc(48);
    for (let i = 0; i < 6; i++) {
      if (littleEndian) tieBuf.writeDoubleLE(tiepoint[i] || 0, i * 8);
      else tieBuf.writeDoubleBE(tiepoint[i] || 0, i * 8);
    }
    entries.push({ tag: 33922, type: 12, count: 6, ptr: cursor });
    extraBlocks.push(tieBuf);
    cursor += tieBuf.length;
  }

  if (geoKeys && geoKeys.length > 0) {
    const gkBuf = Buffer.alloc(geoKeys.length * 2);
    for (let i = 0; i < geoKeys.length; i++) {
      if (littleEndian) gkBuf.writeUInt16LE(geoKeys[i], i * 2);
      else gkBuf.writeUInt16BE(geoKeys[i], i * 2);
    }
    if (gkBuf.length <= 4) {
      throw new Error("GeoKeys buffer unexpectedly <= 4 bytes");
    }
    entries.push({ tag: 34735, type: 3, count: geoKeys.length, ptr: cursor });
    extraBlocks.push(gkBuf);
    cursor += gkBuf.length;
  }

  if (noData !== null) {
    const ndStr = `${noData}\0`;
    let ndBuf = Buffer.from(ndStr, "ascii");
    if (ndBuf.length <= 4) {
      ndBuf = Buffer.concat([ndBuf, Buffer.alloc(5 - ndBuf.length)]);
    }
    entries.push({ tag: 42113, type: 2, count: ndBuf.length, ptr: cursor });
    extraBlocks.push(ndBuf);
    cursor += ndBuf.length;
  }

  entries.sort((a, b) => a.tag - b.tag);
  const ifdOffset = cursor;
  const ifdSize = 2 + entries.length * 12 + 4;
  const totalSize = ifdOffset + ifdSize;

  const out = Buffer.alloc(totalSize);
  out.writeUInt16BE(littleEndian ? 0x4949 : 0x4d4d, 0);
  if (littleEndian) {
    out.writeUInt16LE(42, 2);
    out.writeUInt32LE(ifdOffset, 4);
  } else {
    out.writeUInt16BE(42, 2);
    out.writeUInt32BE(ifdOffset, 4);
  }

  imageData.copy(out, dataOffset);
  let blkPos = dataOffset + paddedDataLen;
  for (const blk of extraBlocks) {
    blk.copy(out, blkPos);
    blkPos += blk.length;
  }

  let ePos = ifdOffset;
  if (littleEndian) out.writeUInt16LE(entries.length, ePos);
  else out.writeUInt16BE(entries.length, ePos);
  ePos += 2;

  for (const ent of entries) {
    if (littleEndian) {
      out.writeUInt16LE(ent.tag, ePos);
      out.writeUInt16LE(ent.type, ePos + 2);
      out.writeUInt32LE(ent.count, ePos + 4);
      if (ent.ptr !== undefined) out.writeUInt32LE(ent.ptr, ePos + 8);
      else if (ent.type === 3) out.writeUInt16LE(ent.val, ePos + 8);
      else out.writeUInt32LE(ent.val, ePos + 8);
    } else {
      out.writeUInt16BE(ent.tag, ePos);
      out.writeUInt16BE(ent.type, ePos + 2);
      out.writeUInt32BE(ent.count, ePos + 4);
      if (ent.ptr !== undefined) out.writeUInt32BE(ent.ptr, ePos + 8);
      else if (ent.type === 3) out.writeUInt16BE(ent.val, ePos + 8);
      else out.writeUInt32BE(ent.val, ePos + 8);
    }
    ePos += 12;
  }

  fs.writeFileSync(path.join(outDir, filename), out);
}

writeTiff({ filename: "thermal-little.tif" });
writeTiff({ filename: "thermal-big.tif", littleEndian: false });
writeTiff({ filename: "thermal-deflate.tif", compression: 8 });
writeTiff({
  filename: "thermal-deflate-predictor2.tif",
  compression: 8,
  predictor: 2,
  pixelFn: (col) => 45000 + col * 100,
});
writeTiff({ filename: "thermal-tiled.tif", isTiled: true });
writeTiff({
  filename: "thermal-projected-utm.tif",
  tiepoint: [0, 0, 0, 500000, 0, 0],
  pixelScale: [100, 100, 0],
  geoKeys: [1, 1, 0, 1, 3072, 0, 1, 32649],
});
writeTiff({
  filename: "qa-projected-utm.tif",
  tiepoint: [0, 0, 0, 500000, 0, 0],
  pixelScale: [100, 100, 0],
  geoKeys: [1, 1, 0, 1, 3072, 0, 1, 32649],
  pixelFn: () => 21824,
});
writeTiff({ filename: "qa-clear.tif", pixelFn: () => 21824 });
writeTiff({
  filename: "qa-outside.tif",
  tiepoint: [0, 0, 0, 120.0, -7.0, 0],
  pixelFn: () => 21824,
});
writeTiff({
  filename: "qa-nodata.tif",
  noData: 64,
  pixelFn: () => 64,
});
writeTiff({
  filename: "thermal-no-georeference.tif",
  hasGeoreference: false,
  geoKeys: [],
});
writeTiff({
  filename: "thermal-geographic-4269.tif",
  geoKeys: [1, 1, 0, 1, 2048, 0, 1, 4269],
});
writeTiff({
  filename: "thermal-georef-no-crs.tif",
  geoKeys: [],
});

console.log("Generated 13 GeoTIFF fixtures in", outDir);

