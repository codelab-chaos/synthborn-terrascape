# Visual Parity Review

The map is now close enough on loading/perf that the next gains should come from making the simplified voxel scene carry more of the same visual cues as the game. The screenshots show three main gaps:

- The map has the large forms right, but loses many small vertical/cosmetic silhouettes that make the settlement read as built space.
- Lighting is flatter and colder than the game. The game image has warm local lights, stronger contact shadowing, softer haze, and less raw sky-blue contrast.
- Trees and structures are represented as block surfaces, while the game relies on denser surface detail, partial-block shapes, and shaded foliage volume.

We should keep these changes optional and measurable. The best near-term path is to improve the scan/mesh data we already generate, then tune lighting and post only after geometry is not obviously missing.

## Current Baseline

Server terrain is a vertex-colored GLB built from top columns plus optional detail voxels. The current mesher applies fixed face shade factors and a lightweight top-corner occlusion heuristic in `TerrainMesher`. The web client uses `HemisphereLight`, `DirectionalLight`, fog, sky time, a few post shaders, and optional fake tree shade planes in `lighting.ts`.

The new cosmetic block modes give us a good experiment harness:

- `Off`: base terrain only.
- `Baked`: base plus cosmetics in one terrain GLB.
- `Split`: base terrain GLB plus cosmetic-only overlay GLB.

Visual parity work should keep using this style: expose toggles, compare screenshots, and track mesh counts/bytes so we know when fidelity is worth the cost.

## Recommended Work

### 1. Improve the Surface Scan for Semantic Detail

This is the highest-impact cheap pass. The game image gets a lot of identity from posts, planks, roofs, fences, ladders, torches, grasses, mushrooms, and raised platforms. Those are not textures; they are small silhouette/detail blocks.

Add a `visual detail scan` tier that collects selected non-ground blocks in the top vertical band of each column. Keep it bounded:

- Scan from recovered ground `+1` to `min(height, ground + 24)` for normal chunks.
- Allow a higher cap around structures or when cosmetic density is already detected.
- Store categories on `TerrainDetail`: `CANOPY`, `COSMETIC_SOLID`, `COSMETIC_THIN`, `LIGHT`, `FOLIAGE_SMALL`.
- Emit category-specific simple geometry instead of every detail being a full cube.

Cheap shape approximations:

- `post`, `pillar`, `fence`, `rail`: narrow cuboid centered in the voxel.
- `torch`, `candle`, `lantern`, `fire`: small emissive cuboid or cross-card marker.
- `slab`, `stair`, `roof`, `shingle`: half-height or stepped cuboid.
- `grass`, `fern`, `mushroom`, `crop`: tiny crossed planes or very small cuboids, capped per chunk.

This should make settlements more recognizable without adding textures. It also gives split mode a clearer visible difference: the overlay should contain real silhouette detail, not just more full cubes.

### 2. Add Better Baked Voxel Ambient Occlusion

The current top-corner shade is a good start, but it only sees column height around top faces. Voxel worlds commonly get a lot of visual depth from per-vertex AO using adjacent occupied voxels. The classic cheap version checks two side voxels and one corner voxel per vertex and maps that to a small occlusion value. 0 FPS describes this as fast, view-independent, and suitable for Minecraft-like worlds.

Apply this to both base terrain and detail meshes:

- For terrain top faces, keep the current height-aware shade but add side/corner occupancy weighting.
- For vertical faces, add per-corner AO so walls, posts, roofs, and cliffs get contact darkening.
- For detail cubes, use local detail occupancy plus nearby base column height as occluders.
- Split quads consistently when AO differs across vertices to avoid diagonal artifacts.

Expected result: less flat block color, stronger contact under overhangs and around decorative structures, closer to the game without runtime GPU cost.

### 3. Calibrate Directional Vertex Lighting

The mesher currently bakes fixed face multipliers, while the client also applies scene lights. Replace fixed multipliers with a simple directional model that matches the active sun direction:

`final = baseColor * (ambient + max(dot(normal, sunDir), 0) * sunStrength + aoTerm)`

Implementation options:

- Server static preset: pick the same default sun ray as `lighting.ts` and bake face/vertex factors into GLB colors.
- Client time-aware preset: keep neutral GLB colors and let `MeshLambertMaterial`/scene lights do more. This is more dynamic, but our current GLB vertex colors already include shade, so we need to avoid double-shading.

Recommended first experiment: server-baked directional factors using the current `SUN_RAY_DIRECTION`, plus a control called `Baked lighting: Fixed / Sun matched / Flat`.

### 4. Add Warm Local Light Markers

The game screenshots have lots of warm torch/fire/window cues. The map currently renders those as block color at best. We can get most of the perception with very cheap markers:

- Classify `torch`, `fire`, `lantern`, `candle`, and lit window blocks during the cosmetic scan.
- Add a tiny emissive mesh or billboard glow, capped per chunk.
- Do not cast real shadows.
- Optionally add a low-cost additive post glow for bright orange pixels, but keep it behind a toggle.

This will immediately make night/dusk and settlement areas feel closer to the game.

### 5. Tune Color Management and Tone

Three.js uses a linear working color space and expects displayed output to be sRGB. The current terrain GLB writes linearized vertex colors, which is good. The visual gap is likely palette/tone rather than a broken color pipeline.

Suggested tune:

- Lower raw sky-blue dominance in daytime by reducing saturation of far sky/fog.
- Warm sun color slightly and cool ambient fill slightly.
- Apply a mild tone curve or exposure control globally, not a stylized shader.
- Add a `visual profile` selector: `Neutral`, `Game-like`, `Diagnostic`.

Avoid making this a one-off color filter. The game-like profile should tune sky, fog, sun, ambient, and terrain brightness together.

### 6. Use Fog and Aerial Perspective More Aggressively

The game image has soft distance haze, while the map often keeps hard silhouettes and saturated far color. We already set `THREE.Fog`, but map tiles and some materials have `fog: false`. That creates a mismatch between terrain chunks, water, backdrop, and far tree silhouettes.

Experiments:

- Let terrain, cosmetic detail, and water participate in fog consistently.
- Keep UI/mob markers out of fog.
- Add a stronger near/far fog preset for game-like mode.
- Consider `FogExp2` only as an option; it is easy to overdo and hide useful map information.

### 7. Consider Screen-Space AO as an Optional Client Toggle

Three.js has an `SSAOPass`; its docs call it a basic SSAO effect, with SAO/GTAO options being more advanced and expensive. This is useful as a diagnostic and screenshot-quality option, but it should not be the first default because it costs per-frame GPU time and can halo around UI-like markers.

Recommended:

- Add `SSAO: Off / Low / Medium` under advanced visuals only after baked AO is in.
- Render at half or capped resolution.
- Exclude mob cards/markers if practical, or keep SSAO disabled when marker density is high.

### 8. Palette Calibration From Known Game/Map Samples

Without textures, we can still make block colors feel closer by calibrating vertex colors against the game view:

- Capture representative in-game screenshots and map screenshots at the same locations/time.
- Sample broad color groups: grass, dirt, bark, roof/planks, snow, stone, water, foliage.
- Build a small material color correction table for Terrascape terrain IDs.
- Apply corrections server-side before GLB color output.

This is cheaper and more controllable than texture projection. It also avoids making the map look like an unrelated renderer.

## Experiment Order

1. `Visual detail scan v1`: add category-specific cosmetic detail and thin geometry. Use split mode to compare geometry cost.
2. `Baked AO v1`: add side/corner per-vertex AO for base terrain and detail meshes.
3. `Lighting profile`: add `Neutral` and `Game-like` profiles for sun, ambient, fog, and terrain brightness.
4. `Local warm lights`: add emissive markers for torches/fire/lanterns, capped per chunk.
5. `Shape heuristics`: half-height slabs/roofs/stairs/posts/fences from cosmetic categories.
6. `Palette calibration`: tune material color groups from screenshot pairs.
7. `Optional SSAO`: only if baked AO does not give enough contact depth.

## Suggested Settings

Add these as advanced visual settings:

- `Cosmetic blocks`: existing `Off / Baked / Split`.
- `Visual detail`: `Off / Structures / Structures + foliage`.
- `Detail shapes`: `Cube / Simple shapes`.
- `Baked AO`: `Off / Light / Strong`.
- `Lighting profile`: `Neutral / Game-like / Diagnostic`.
- `Local glow`: `Off / Markers / Markers + bloom`.
- `SSAO`: `Off / Low / Medium`.

## Risks

- Detail scan can explode mesh size if it blindly collects every above-ground voxel. Keep category filters and per-chunk caps.
- Split cosmetics save server cache bytes for the base mesh, but increase client object count and requests.
- Post-processing can make screenshots look better while making interactive map reading worse. Keep it optional.
- More fog improves parity but can hurt navigation. Tie stronger fog to the game-like profile, not the default diagnostic view.
- Shape heuristics based on block ID keywords can misclassify assets. Log category counts per chunk so bad matches are easy to spot.

## Sources

- 0 FPS, "Ambient occlusion for Minecraft-like worlds": https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/
- Three.js `HemisphereLight` docs: https://threejs.org/docs/pages/HemisphereLight.html
- Three.js `SSAOPass` docs: https://threejs.org/docs/pages/SSAOPass.html
- Three.js color management manual: https://threejs.org/manual/en/color-management.html
