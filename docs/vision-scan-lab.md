# Vision Scan Lab

The inventory page no longer exposes Live scan, Photo scan, or Video scan in
the production UI.

Barcode scanning remains part of the inventory product surface.

## Current Production Behavior

- `/inventory` shows Barcode and manual Add actions.
- `apps/web/src/app/inventory/vision-scan-modal.tsx` is retained as lab code but
  is not imported by the production inventory page.
- `POST /api/vision/analyze` is guarded by `VISION_SCAN_LAB_ENABLED`.
- If `VISION_SCAN_LAB_ENABLED` is not exactly `true`, the web proxy returns
  `404`.

This prevents the unfinished vision scan flow from being discovered or called
from production by accident.

## Working On Vision Scan Later

Use a separate branch for the lab flow.

In that branch:

1. Reintroduce the Live, Photo, and Video entry points in
   `apps/web/src/app/inventory/inventory-client.tsx`.
2. Import and render `VisionScanModal`.
3. Set `VISION_SCAN_LAB_ENABLED=true` in the local or preview environment.
4. Keep Barcode separate unless the product decision changes.

Do not enable `VISION_SCAN_LAB_ENABLED` in production until the scan flow has a
reviewed product spec, stable runtime behavior, and a validation plan.

## Why This Is Not Just CSS-Hidden

The scan flow is intentionally removed from the page entry points and guarded at
the server route. CSS hiding would still leave an unfinished feature callable
and easy to expose accidentally.
