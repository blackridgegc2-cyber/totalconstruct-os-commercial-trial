# Precision geospatial site-placement engine — implementation specification
Status: Proposed; no production implementation/acceptance asserted.
Related: docs/requirements/site-faithful-architectural-visualization.md

## Architecture
Build a dedicated Site Design Studio module integrated with Total Connect. Use CesiumJS or equivalent geospatial 3D frontend with pluggable licensed imagery, elevation and terrain providers. Optional Google Maps Photorealistic 3D Tiles as live visualization only, subject to Google Map Tiles API policies, attribution, content-retention, export, derivative-data, and usage restrictions. Never scrape Google Earth screenshots or derive an engineered terrain model from prohibited Google mapping content. Allow independent licensed DEM/LiDAR/survey data for measurements.

## Core dimensional controls
- Store immutable source image/model with provenance and licensing flags.
- Ground model footprint in true local coordinate system (e.g. ENU), dimensions in feet, explicit property geolocation and center point, azimuth heading, finished floor elevations, foundation datum, photo camera projection.
- Preserve locked plan geometry; 70 by 30 ft test case must be 2100 sqft footprint, not rescaled to match a compelling photo.
- Separate scale-control evidence: 40 by 40 ft shop; 50 by 90 ft existing house; visually close-sized nearby house. Use perspective-correct projected geometry, not naive 2D pixel-width ratios across different depths. A single oblique image cannot guarantee exact dimensioning without camera geometry/georegistration.
- Allow footprint polygon placement on plan map plus 3D preview; click points and drag-rotate by numerical azimuth and locked width/depth. Persist prior versions and user confirmations.
- Keep locked site and existing features; only alter explicit building/clearing/grading mask. Show overlay/diff and protected mask outside edit.
- Clearing offset from house exterior 20 ft (test case). Calculate buffer polygon and count/area only from licensed tree survey or operator-marked inventory; not imagery inference where disallowed.
- No invented additions or automatic garage, pool, terrace, retaining wall, new drive, lighting, landscape, or trees. Optional elements default off; authorization required.
- Site terrain slope: show terrain resolution, accuracy and source; flagged cut/fill, bench, foundation type and retainage alternatives must be verified by survey/geotech/civil; never claim engineering quantities from screenshot.
- Camera locked to original screenshot for true overlay; optional separate synthetic client-facing viewpoints marked as simulated.
- Rendering AI can change appearance only within permitted masks, after geometry and scale are locked.

## User journey
Source intake (photo/URL/screenshot/sketch/PDF/CAD optional) → site selection → imagery license/data quality check → reference dimensions → 2D true footprint location → azimuth front orientation → finished floor elevation → optional approved clearing mask → 3D composite preview → scale validation & visual-diff audit → user approvals → estimate revision integration → branded client pack.
Enable interactive before/after, 50% opacity overlay, top-down 2D dimensional footprint + perspective 3D, and comparison to nearby reference object. One-click reset to original. Keep asset/version IDs in project.

## Proposed technical data shape
site: {lat, lon, terrain_provider, imagery_provider, imagery_date, vertical_datum, source_permissions}
footprint: {geometry_local_m, width_ft, depth_ft, elevation_ft, rotation_deg, locked:true}
camera: {position, heading, pitch, roll, intrinsic_estimate, locked:true}
source_geometry: {model_uri, model_type, provenance, known_dimensions, confidence}
changes: {scope_mask, clearing_buffer_ft, approved_extras:[], actor, timestamp, approval_id}
outputs: {before_view, proposed_view, dimensioned_site_plan, visual_diff, qa_report, provenance, cost_impact_links, client_approval}

## Functional tests and acceptance
1. 70x30 footprint cannot visually exceed perspective-correct physical size relative to 40x40 shop or 50x90 existing house when camera/georegistration is calibrated.
2. With insufficient camera/scale data, application visibly marks approximate and requests survey or user control points; never reports precision it cannot substantiate.
3. Test front elevation viewpoint; preserve geometry and do not falsely label alternative synthetic camera view as original-photo overlay.
4. Pixel difference outside approved photo mask is 0 on overlay export except expected compression/formatting; separate rendering attribution preserved.
5. AI additions detector: unsupported pool, garage, landscaping, road, retaining wall, arbitrary tree clearing must fail.
6. 20ft clearing zone and any grading are dimensionally overlaid; 20ft refers to house perimeter, not 20ft total.
7. Role-scoped persistence, audit trail, explicit approvals and version rollback. Changes do not silently touch contract, pay app or previously approved estimates.
8. Demo test uses user-provided site screenshot and licensed Plan 75178 website views with no CAD requirement. Must produce honest confidence grade and identify unresolved geometry or elevation.

## Phases
A. Accurate 2D georeferenced footprint, azimuth, dimensions, buffers and confidence meter.
B. 3D model upload/rough reconstruction, DEM-based terrain, adjustable FFEs, camera match and visual-diff masking.
C. Photo-real render with strict geometry/background constraints and client presentation.
D. Estimating and design-revision integration with signature and role permissions.

## Non-goals
No direct Google Earth Pro desktop automation claimed. No unrestricted export of Google 3D tiles or terrain capture. No final engineered grading or earthwork quantities without proper licensed/surveyed inputs.
