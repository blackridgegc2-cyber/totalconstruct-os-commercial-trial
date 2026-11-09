# Site-faithful architectural visualization — product acceptance requirement
Status: REQUIRED / NOT IMPLEMENTED OR ACCEPTED
Reference: Family Home Plans 75178; user-supplied Google Earth Pro hillside view, 3407 Elder Hill Rd, Driftwood TX. Reference is a demonstration case, not an authorization to reproduce copyrighted construction drawings.

## Critical principle
A client visualization is an evidence-grounded visual overlay, NOT a creative scene reinterpretation. Preserve all original pixels and location/context outside the expressly authorized construction-change mask. Never invent buildings, driveways, pools, garages, retaining walls, grading, landscaping, roofs, or other improvements. No unsolicited redesign, geometry changes, camera moves, tree removal or altered terrain.

## Inputs
- Client-provided picture, sketch, generic floor-plan PDF, architectural elevations, website listing/screenshots, or fuller plan/model.
- Client-provided site aerial / photograph / terrain image (e.g., Google Earth screenshot), dated and archived as the original unmodified base layer.
- Real known dimensions/calibration references (in test case 40 x 40 ft existing shop); proposed house 70 ft wide x 30 ft deep; proposed clearing 20 ft from exterior perimeter.
- Explicit placement pin/footprint, front elevation view direction, grade interpretation and authorized improvements.

## Workflow
1. Preserve source snapshots, link citations, author, date, authorization and licensing status. Assign source-confidence and identify contradictions.
2. Operator aligns proposed footprint by control points, reference objects, orientation, terrain, and perspective vanishing points. Allow manual lock and numerical overrides. Quantities and dimensions are not guessed from perspective photographs.
3. Establish scale using the 40 x 40 shop and, where possible, additional georeferenced coordinates, map scale/terrain/orthophoto; mark results approximate if only a screenshot exists.
4. Reconstruct building geometry from supplied views conservatively; model precisely what is visible and flag unshown geometry for review. Do not claim exactness where references are insufficient.
5. Overlay the house in the requested location/orientation, with photo-aligned shadows, occlusion, foreground tree masks and realistic view. Preserve all terrain/trees beyond approved clearing, ~20 ft around house in this case.
6. Separate existing-site layer, proposed building layer, approved grading/clearing layer, optional additions layer. Default all optional additions OFF.
7. Support explicit before/after slider, source/overlay opacity, rotate/reposition/resize with anchored physical dimensions, and site-view versus house-front-elevation views. If the original camera cannot show the front elevation, report that and produce a separately labeled synthetic front-elevation camera view, never pretend it's unchanged original site photography.
8. Generate takeoff or estimate impacts only from actual measured or explicitly assumed quantities, with confidence, source and manual QC. Revisions update drawing register, cost delta, schedule delta and approval workflow only when authorized.
9. Save immutable source and render iterations, owner-requested changes, dimension checks and approvals in the project; flag illustrative rendering as non-survey, non-engineering unless verified by licensed source.

## Acceptance test — Plan 75178 hillside
- Existing Google Earth satellite/oblique photograph remains recognizably unchanged: surrounding homes, shop, road, trees and slope are not redesigned.
- Proposed house reflects the exact supplied modern shed-roof elevations (two levels, long balcony/porch, wood/stone finishes, glazing), not a gabled rustic substitute.
- 70 ft width and 30 ft depth, visibly and quantitatively calibrated against existing 40 x 40 shop; no oversized model.
- Place below original yellow pin, as instructed, orient to show *front elevation* while honoring source camera geometry; if incompatible, display camera limitation and a separate clearly-labeled new virtual view.
- Remove only trees inside construction footprint and expressly specified 20-foot surrounding clearance, with optional individual-tree retention controls.
- Never add a pool, detached garage, access road, hardscape, terrace, or site structures unless approved as part of rendering scope; a garage in the plan may be modeled only if user explicitly requests it for the site composition.
- Show calibration overlay, dimensional annotation, visualization-confidence status and rendered-vs-source differences.
- Zero pixel changes outside approved masks except permitted rendering adjustments to image resolution/cropping.
- Regression/visual diff tests compare original image to resulting masked composite, validate bounding-box size ratios and classify unapproved hallucinated additions as a failed acceptance gate.

## Release
This is a new product requirement, not a declaration of built capability. Implement in dedicated architectural visualization/modeling service integrated with Total Connect project controls. Keep current Total Connect financial release gates independent; require a separate signed visualization acceptance test before labeling the feature production-ready.
