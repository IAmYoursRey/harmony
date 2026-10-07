import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {normalizeFirmsQuery, parseFirmsCsv, fetchFirmsSnapshot} from '../apps/server/src/services/firmsIntegrity.js';
const bundle=await build({stdin:{contents:"export * from './apps/web/src/services/geospatial/chartStatistics.ts'; export {firmsService} from './apps/web/src/services/geospatial/firmsService.ts'; export * from './apps/web/src/services/geospatial/earthquakeSnapshotService.ts'; export {stacService} from './apps/web/src/services/geospatial/stacService.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env':'{}'}});
globalThis.localStorage={getItem:()=>null};
const {buildWindRose,summarizeTemperature,firmsService,isValidUsgsFeed,earthquakeRetrievalState,stacService}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let groups=0;const pass=name=>{groups++;console.log('PASS '+name);};
assert.equal(summarizeTemperature([1,2,3,4]).median,2.5);assert.equal(summarizeTemperature([1,2,3,4]).q1,1.75);assert.equal(summarizeTemperature([null,undefined,NaN]).min,null);assert.equal(summarizeTemperature([8,8,8,8]).histogram.length,1);assert.equal(summarizeTemperature([8,8,8,8]).histogram[0].frekuensi,4);pass('quartiles interpolate even samples; missing and constant series remain honest');
const rose=buildWindRose([{windSpeed:5,windDirection:359},{windSpeed:5,windDirection:1},{windSpeed:0,windDirection:0},{windSpeed:null,windDirection:40},{windSpeed:4,windDirection:null}]);
assert.equal(rose.bins[0].count,2);assert.equal(rose.calmCount,1);assert.equal(rose.sampleCount,3);assert.equal(rose.missingCount,2);assert.ok(Math.abs(rose.bins.reduce((n,b)=>n+b.frequency,0)+rose.calmPct-100)<1e-8);pass('north wraparound and calm wind separate; null directions are not north');
const header='latitude,longitude,bright_ti4,acq_date,acq_time,satellite,confidence,frp';
assert.throws(()=>normalizeFirmsQuery({bbox:'not-a-bbox'}),/INVALID_BBOX/);assert.throws(()=>normalizeFirmsQuery({bbox:'0,-5,10,5',source:'FAKE'}),/INVALID_SOURCE/);assert.throws(()=>normalizeFirmsQuery({bbox:'0,-5,10,5',dayRange:8}),/INVALID_DAY_RANGE/);
assert.throws(()=>parseFirmsCsv(header+'\n999,0,300,2026-10-03,0015,21,h,0','VIIRS_NOAA21_NRT'),/ALL_CSV_RECORDS_INVALID/);assert.throws(()=>parseFirmsCsv(header+'\n0,0,300,2026-02-30,0015,21,h,0','VIIRS_NOAA21_NRT'),/ALL_CSV_RECORDS_INVALID/);assert.equal(parseFirmsCsv(header,'MODIS_NRT').records.length,0);const point=parseFirmsCsv(header+'\n0,0,,2026-10-03,45,21,h,0','VIIRS_NOAA21_NRT').records[0];assert.equal(point.acqTime,'0045');assert.equal(point.brightness,null);assert.equal(point.frp,0);pass('FIRMS invalid parameters/records fail; valid empty, zero and optional intensity preserved');
const now=Date.parse('2026-10-03T12:00:00Z');const calls=[];
const snapshot=await fetchFirmsSnapshot(normalizeFirmsQuery({bbox:'-180,-90,180,90',source:'ALL',dayRange:7}),'TEST_KEY',{now,useCache:false,fetchImpl:async url=>{calls.push(new URL(url));return new Response(header+'\n0,0,,2026-10-03,0045,21,h,0\n0,0,300,2026-09-01,0100,21,h,2',{status:200});}});
assert.equal(snapshot.success,true);assert.equal(snapshot.dayRange,7);assert.equal(calls.length,8);assert.ok(calls.every(u=>Number(u.pathname.split('/').at(-2))<=5));assert.equal(new Set(snapshot.data.map(r=>r.source)).size,4);assert.equal(snapshot.data.length,4);assert.equal(snapshot.windowStart,'2026-09-26T12:00:00.000Z');pass('seven days are fetched in bounded windows for all four sources; exact duplicates and old records excluded');
const partial=await fetchFirmsSnapshot(normalizeFirmsQuery({bbox:'-180,-90,180,90',source:'ALL',dayRange:1}),'TEST_KEY',{now,useCache:false,fetchImpl:async url=>url.includes('MODIS_NRT')?new Response('failure',{status:503}):new Response(header+'\n0,0,300,2026-10-03,0045,21,h,0',{status:200})});
assert.equal(partial.success,true);assert.equal(partial.provenance.dataStatus,'PARTIAL');assert.equal(partial.sourceAttempts.filter(a=>a.status==='FAILED').length,1);assert.equal(partial.data.length,3);assert.equal(JSON.stringify(partial).includes('TEST_KEY'),false);pass('one failed source stays visible as PARTIAL, not all-source success, with sanitized errors');
const bad=await fetchFirmsSnapshot(normalizeFirmsQuery({bbox:'-180,-90,180,90'}),'TEST_KEY',{now,useCache:false,fetchImpl:async()=>new Response(header+'\n999,0,300,2026-10-03,0045,21,h,0')});assert.equal(bad.success,false);assert.equal(bad.provenance.dataStatus,'UNAVAILABLE');pass('all invalid FIRMS records cannot appear as successfully verified zero detections');
const imported=firmsService.analyzeHotspots('latitude,longitude,brightness,acq_date,acq_time,satellite,instrument,confidence,frp\n0,0,,2026-10-03,45,21,VIIRS,unknown,0\n30,30,300,2026-10-03,45,N,VIIRS,h,1',null,[-1,-1,1,1],1,'all','USER_CSV_IMPORT');assert.equal(imported.data.hotspots.length,1);assert.equal(imported.data.hotspots[0].satellite,'NOAA-21');assert.equal(imported.data.hotspots[0].acqTimeUtc,'00:45 UTC');assert.equal(imported.data.lowConfidenceCount,0);assert.equal(imported.provenance.coverageFraction,undefined);pass('CSV bbox, NOAA-21, UTC time and unknown confidence are accurate; point ratio is not area coverage');
assert.equal(bad.receivedCount,1);assert.equal(bad.rejectedCount,1);
const invalidImport=firmsService.analyzeHotspots('nonsense\nwrong',null,[-1,-1,1,1],1,'all','USER_CSV_IMPORT');assert.equal(invalidImport.processingState,'failed');assert.equal(invalidImport.dataStatus,'UNAVAILABLE');assert.equal(invalidImport.data,null);pass('rejected counts survive backend failures; invalid CSV import cannot report zero success');
assert.equal(isValidUsgsFeed({features:[]}),true);assert.equal(isValidUsgsFeed({features:[{}]}),false);assert.equal(earthquakeRetrievalState(false,false),'STALE');assert.equal(earthquakeRetrievalState(true,false),'PARTIAL');assert.equal(earthquakeRetrievalState(true,true),'LIVE');pass('earthquake source validity determines live/partial/stale, not fulfilled promises');
const originalFetch=globalThis.fetch;let stacCalls=0;
try {
 globalThis.fetch=async()=>{stacCalls++;return new Response(JSON.stringify({type:'FeatureCollection',features:[{id:'S2_test',collection:'sentinel-2-l2a',bbox:[0,0,1,1],properties:{datetime:'2026-10-01T00:00:00Z','eo:cloud_cover':'unknown'},assets:{metadata:{href:'https://example.org/metadata.json',type:'application/json'},B04:{href:'https://example.org/B04.tif',type:'image/tiff; application=geotiff; profile=cloud-optimized'},thumbnail:{href:'https://example.org/thumbnail.jpg',type:'image/jpeg'}}}]}));};
 const scenes=await stacService.searchSatelliteScenes({bbox:[0,0,1,1]});assert.equal(scenes.success,true);assert.equal(scenes.scenes[0].cloudCover,null);assert.equal(scenes.scenes[0].platform,'Tidak tersedia');assert.equal(scenes.scenes[0].provenance.dataStatus,'ARCHIVED');assert.equal(scenes.scenes[0].provenance.uncertainty,undefined);
 assert.equal(scenes.scenes[0].assets.metadata.isCloudOptimizedGeoTiff,false);
 assert.equal(scenes.scenes[0].assets.B04.isCloudOptimizedGeoTiff,true);
 assert.equal(scenes.scenes[0].assets.thumbnail.isCloudOptimizedGeoTiff,false);
 const multiPolyResult = await stacService.searchSatelliteScenes({ intersects: { type: 'MultiPolygon', coordinates: [[[[112,-8],[113,-8],[113,-7],[112,-7],[112,-8]]]] } });
 assert.equal(multiPolyResult.success, true);
 globalThis.fetch=async()=>new Response(JSON.stringify({type:'FeatureCollection',features:[]}));assert.equal((await stacService.searchSatelliteScenes({bbox:[0,0,1,1]})).success,true);
 const controller=new AbortController();stacCalls=0;globalThis.fetch=async(_url,{signal})=>{stacCalls++;controller.abort();assert.equal(signal.aborted,true);throw new DOMException('aborted','AbortError');};
 await assert.rejects(stacService.searchSatelliteScenes({bbox:[0,0,1,1],signal:controller.signal}),e=>e.name==='AbortError');assert.equal(stacCalls,1);
}finally{globalThis.fetch=originalFetch;}
pass('STAC catalog distinguishes COG from metadata/thumbs, handles MultiPolygon, and preserves ARCHIVED status');
const budget=await fetchFirmsSnapshot(normalizeFirmsQuery({bbox:'-180,-90,180,90',source:'ALL',dayRange:7}),'TEST_KEY',{now,useCache:false,totalTimeoutMs:0,fetchImpl:async()=>{throw new Error('Request must not start after budget');}});assert.equal(budget.success,false);assert.equal(budget.sourceAttempts.length,8);assert.ok(budget.sourceAttempts.every(a=>a.error==='REQUEST_BUDGET_EXHAUSTED'));pass('global request deadline keeps every skipped source/window visible as failed');

// Route-level testing for strict coordinate, datetime, and numeric string validation
const expressModule = (await import('express')).default;
const bmkgRouter = (await import('../apps/server/src/routes/bmkgRoutes.js')).default;
const { getCurrentWeatherProxy } = await import('../apps/server/src/controllers/spatialController.js');

const app = expressModule();
app.use('/bmkg', bmkgRouter);
app.get('/weather', getCurrentWeatherProxy);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

let mockBmkgPayload = null;
globalThis.fetch = async (url) => {
  if (url.includes('data.bmkg.go.id')) {
    return new Response(JSON.stringify(mockBmkgPayload), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return originalFetch(url);
};

try {
  // 1. String coordinate with trailing junk "12junk" must be rejected with 502
  mockBmkgPayload = { Infogempa: { gempa: { Coordinates: "12junk,107.0", Magnitude: "5.0", DateTime: "2026-10-03T00:00:00Z" } } };
  const res1 = await originalFetch(`${origin}/bmkg/gempa/autogempa`);
  assert.equal(res1.status, 502);

  // 2. Latitude outside [-90, 90] must be rejected
  mockBmkgPayload = { Infogempa: { gempa: { Coordinates: "95.0,107.0", Magnitude: "5.0", DateTime: "2026-10-03T00:00:00Z" } } };
  const res2 = await originalFetch(`${origin}/bmkg/gempa/autogempa`);
  assert.equal(res2.status, 502);

  // 3. Magnitude with junk "5.0junk" must be rejected
  mockBmkgPayload = { Infogempa: { gempa: { Coordinates: "-7.0,107.0", Magnitude: "5.0junk", DateTime: "2026-10-03T00:00:00Z" } } };
  const res3 = await originalFetch(`${origin}/bmkg/gempa/autogempa`);
  assert.equal(res3.status, 502);

  // 4. Invalid date string must be rejected
  mockBmkgPayload = { Infogempa: { gempa: { Coordinates: "-7.0,107.0", Magnitude: "5.0", DateTime: "bukan-tanggal-valid" } } };
  const res4 = await originalFetch(`${origin}/bmkg/gempa/autogempa`);
  assert.equal(res4.status, 502);

  // 5. Weather proxy rejecting "12junk" coordinates with 400
  const res5 = await originalFetch(`${origin}/weather?lat=12junk&lng=107.0`);
  assert.equal(res5.status, 400);

  // 6. Weather proxy rejecting out of bounds latitude with 400
  const res6 = await originalFetch(`${origin}/weather?lat=95.0&lng=107.0`);
  assert.equal(res6.status, 400);

  pass('strict numeric parsing rejects invalid coordinate strings, out-of-bounds locations, and malformed timestamps');
} finally {
  globalThis.fetch = originalFetch;
  server.close();
}

console.log('Recovery follow-up: '+groups+' groups passed.');
