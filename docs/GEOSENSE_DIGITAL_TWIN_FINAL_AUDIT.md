# GeoSense Digital Twin Final Audit

## 1. Current Structure & Role Mapping
The Digital Twin subsystem consists of:
- **Legacy SVG System**: Remains intact (`GET/POST /api/digital-twin/legacy/:schoolId`), accessible via "Editor SVG (Lama)" in `DigitalTwinView.tsx`.
- **New Grid Simulation System**: 
  - **Teacher Role**: Can create maps (`GridMap`), create scenarios (`DisasterSimulation`), and instantiate `GameRoom`.
  - **Student Role**: Views available `GameRoom` matching their `schoolId` and `classSection`. Upon joining, student enters a grid-based Game Engine (`GameView.tsx`).

## 2. Realtime & Multiplayer (Gap Analysis)
- **Current Issue**: The `GameView.tsx` engine updates player positions locally on the client. It does *not* broadcast movements back to the server in real-time.
- **Current Issue**: `RoomManager.tsx` (Teacher monitor) only shows finished results, but lacks a live visual map to track `players` currently running the simulation.
- **Decision**: We need to implement a polling sync endpoint `POST /rooms/:roomId/sync` to pipe student coordinates and HP to the server every 1000ms. Teacher will poll the room state to map `● Player` icons on a GridCanvas.

## 3. UI/UX & Gameplay Hardening (Gap Analysis)
- **Mobile Controls**: `VirtualJoystick.tsx` exists but needs to ensure touch events are snappy and it doesn't cause page scrolling.
- **HUD & Visuals**: Needs a polished overlay (Glow, Transitions, better color tokens).
- **Empty States**: We need clearer placeholders if the teacher hasn't created a map or simulation yet.
- **Door Mechanics**: Need a simple interaction (e.g. holding near a door) or auto-open on touch. Right now, doors are just marked on the grid.

## 4. API Endpoints
- **Maps**: `GET /maps`, `POST /maps`, `GET /maps/:id`, `PUT /maps/:id`, `DELETE /maps/:id` -> OK.
- **Simulations**: `GET /simulations`, `POST /simulations`, `DELETE /simulations/:id` -> OK.
- **Rooms**: `GET /rooms`, `POST /rooms`, `POST /rooms/:roomId/join`, `POST /rooms/:roomId/start`, `POST /rooms/:roomId/end`, `POST /rooms/:roomId/result`, `GET /rooms/:roomId/results` -> OK.
- **TODO ADD**: `POST /rooms/:roomId/sync` for live player telemetry.

## 5. Security & Authorization
- Only teachers can POST/PUT/DELETE. (Verified by 23 passing tests).
- Students can only GET their own class rooms and POST join/result. (Verified).
- School isolation prevents cross-school data leaks. (Verified).

## 6. Execution Plan
1. **Backend Update**: Add `/rooms/:roomId/sync` to `digitalTwin.js` and extend `Room` model to store live `activePlayers` object.
2. **Frontend Update (Student)**: Inject polling in `GameView.tsx` (every 1s) to push `player` state to `/sync` and fetch the server's authoritative game status.
3. **Frontend Update (Teacher)**: Enhance `RoomManager.tsx` to render a `GridCanvas` populated with `activePlayers` when status is `RUNNING`.
4. **UI/UX Polish**: Refine `VirtualJoystick`, add CSS classes for glowing hazards, improve empty states in `MapList` and `SimulationCreator`.
5. **Documentation**: Output final cleanup and architecture reports.
