import assert from 'node:assert/strict';import {build} from 'esbuild';import express from 'express';
import bmkgRouter from '../apps/server/src/routes/bmkgRoutes.js';
import {getTrafficFlowProxy, getHotspots} from '../apps/server/src/controllers/spatialController.js';
const bundle=await build({stdin:{contents:"export {geospatialDataTelemetryService as telemetry} from './apps/web/src/services/geospatialDataTelemetryService.ts'; export {stacService as stac} from './apps/web/src/services/geospatial/stacService.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env':'{}'}});globalThis.localStorage={getItem:()=>null};
const {telemetry,stac}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));let passed=0,failed=0;const check=async(name,fn)=>{try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+': '+e.message);}};
const data={fetchedAt:'2026-10-03T00:00:00Z',elevation:0,current:{consensusTemperature:10,precipitationProb:null,uvIndex:null},sourceFetches:[],modelComparison:[],modelSpread:null,dataStatus:'AVAILABLE'};
const raw={current:{temperature_2m:10,cloud_cover:20},hourly:{time:[1,2]}};
await check('nearby failed location cannot erase or reuse another snapshot',()=>{telemetry.recordRawIngestion(-7.25001,112.75,'A',raw,null,data,undefined,'query-A');telemetry.recordFailedIngestion(-7.25002,112.75,'B',[],'query-B');assert.equal(telemetry.getLatestSnapshot()?.locationName,'A');assert.equal(telemetry.getSnapshotForLocation(-7.25001,112.75,'query-A')?.locationName,'A');assert.equal(telemetry.getSnapshotForLocation(-7.25002,112.75),null);assert.equal(telemetry.getSnapshotForLocation(-7.25001,112.75,'missing-query'),null);});
await check('snapshot nested values are detached and immutable',()=>{telemetry.recordRawIngestion(-7.3,112.75,'Immutable',raw,null,data,undefined,'immutable');const saved=telemetry.getLatestSnapshot();raw.current.temperature_2m=999;assert.equal(saved.rawWeatherResponse.current.temperature_2m,10);assert.equal(Object.isFrozen(saved.rawParameters),true);assert.equal(Object.isFrozen(saved.rawWeatherResponse.hourly.time),true);});
const originalFetch=globalThis.fetch;let payload;
const scene={id:'S2_test',collection:'sentinel-2-l2a',bbox:[0,0,1,1],properties:{datetime:'2026-10-01T00:00:00Z'},assets:{ordinary:{href:'https://example.org/ordinary.tif',type:'image/tiff'},cog:{href:'https://example.org/raster?signature=x',type:'image/tiff; profile=cloud-optimized; application=geotiff'}}};
globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify({type:'FeatureCollection',features:[scene]}));};
await check('ordinary TIFF is not COG; declared COG with reordered media parameters is recognized',async()=>{const r=await stac.searchSatelliteScenes({bbox:[0,0,1,1]});assert.equal(r.scenes[0].assets.ordinary.isCloudOptimizedGeoTiff,false);assert.equal(r.scenes[0].assets.cog.isCloudOptimizedGeoTiff,true);});
const geometry={type:'MultiPolygon',coordinates:[[[[0,0],[3,0],[3,3],[0,3],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]]]};
await check('STAC query preserves MultiPolygon/holes instead of replacing exact scope with bbox',async()=>{await stac.searchSatelliteScenes({intersects:geometry});assert.deepEqual(payload.intersects,geometry);assert.equal(payload.bbox,undefined);});
await check('invalid STAC geometry is rejected before a wider provider query',async()=>{await assert.rejects(stac.searchSatelliteScenes({intersects:{type:'Polygon',coordinates:[[[181,0],[182,0],[182,1],[181,1],[181,0]]]} }),/valid|rentang/i);});
await check('manual source audit retains PARTIAL and rejects null traffic speed',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:[],partial:true,provenance:{dataStatus:'PARTIAL'}}));assert.equal((await telemetry.pingEndpoint('nasa_firms')).status,'DEGRADED');
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{currentSpeedKmh:null}}));assert.equal((await telemetry.pingEndpoint('tomtom_traffic')).status,'OFFLINE');
});
globalThis.fetch=originalFetch;
const app=express();app.get('/traffic',getTrafficFlowProxy);app.get('/fires',getHotspots);app.use('/bmkg',bmkgRouter);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;const originalKey=process.env.TOMTOM_API_KEY;process.env.TOMTOM_API_KEY='TEST_KEY_DO_NOT_LOG';
try{
 await check('BMKG rejects impossible calendar dates rather than normalizing them',async()=>{
  globalThis.fetch=async()=>new Response(JSON.stringify({Infogempa:{gempa:{Coordinates:'0,0',Magnitude:'0',DateTime:'2026-02-30T00:00:00Z'}}}));const res=await originalFetch(origin+'/bmkg/gempa/autogempa');assert.equal(res.status,502);assert.equal((await res.json()).success,false);
 });
 await check('valid traffic preserves zero speed and road closure',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({flowSegmentData:{currentSpeed:0,freeFlowSpeed:50,currentTravelTime:0,freeFlowTravelTime:10,confidence:0,roadClosure:true,coordinates:{coordinate:[{latitude:0,longitude:0},{latitude:0.01,longitude:0.01}]}}}));const res=await originalFetch(origin+'/traffic?lat=0&lng=0');const body=await res.json();assert.equal(res.status,200);assert.equal(body.success,true);assert.equal(body.data.currentSpeedKmh,0);assert.equal(body.data.confidence,0);assert.equal(body.data.roadClosure,true);
 });
 await check('traffic HTTP 200 empty flow cannot report LIVE success',async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({flowSegmentData:{}}));const res=await originalFetch(origin+'/traffic?lat=0&lng=0');assert.equal(res.status,502);assert.equal((await res.json()).success,false);});
 await check('traffic rejects numeric junk coordinates',async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({flowSegmentData:{}}));assert.equal((await originalFetch(origin+'/traffic?lat=12junk&lng=0')).status,400);});
 await check('traffic error response never leaks upstream URL/key',async()=>{globalThis.fetch=async()=>{throw new Error('https://upstream.invalid?key=TEST_KEY_DO_NOT_LOG');};const res=await originalFetch(origin+'/traffic?lat=0&lng=0');assert.equal((await res.text()).includes('TEST_KEY_DO_NOT_LOG'),false);});
 await check('legacy MAP_KEY remains compatible without exposing the key',async()=>{
  const previousNew=process.env.FIRMS_MAP_KEY,previousOld=process.env.MAP_KEY;
  try{delete process.env.FIRMS_MAP_KEY;process.env.MAP_KEY='LEGACY_TEST_KEY';let usedLegacy=false;
   globalThis.fetch=async url=>{usedLegacy=String(url).includes('/LEGACY_TEST_KEY/');return new Response('latitude,longitude,acq_date,acq_time');};
   const res=await originalFetch(origin+'/fires?bbox=0,0,1,1&dayRange=1');const body=await res.json();assert.equal(res.status,200);assert.equal(body.success,true);assert.equal(usedLegacy,true);assert.equal(JSON.stringify(body).includes('LEGACY_TEST_KEY'),false);
  }finally{if(previousNew===undefined)delete process.env.FIRMS_MAP_KEY;else process.env.FIRMS_MAP_KEY=previousNew;if(previousOld===undefined)delete process.env.MAP_KEY;else process.env.MAP_KEY=previousOld;}
 });
}finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.TOMTOM_API_KEY;else process.env.TOMTOM_API_KEY=originalKey;await new Promise(r=>server.close(r));}
console.log('Gemini review: '+passed+' groups passed; '+failed+' failed.');process.exitCode=failed?1:0;
