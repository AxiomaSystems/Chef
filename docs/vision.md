# Vision

Vision is a planned Preppie capability, not an active beta feature.

The hosted YOLO/FastAPI sidecar and product inference routes were retired under
#92 because the experimental model/runtime was not ready or licensed for the
proprietary product. apps/vision-lab remains an opt-in research workspace for
Gallo; its scripts, checkpoints, datasets, and results are not production
artifacts.

The API retains provider-neutral, authenticated VisionObservation lifecycle
routes so existing evidence can be reviewed, discarded, exported, or deleted.
Those routes do not perform inference. Adding an observation to inventory
requires an explicit user action.

Any future implementation—Gallo's cleaned model, GPT Vision, or another
provider—must pass #135 before staging or production activation. That gate owns
licensing, model delivery, accuracy, input limits, authentication, privacy,
retention, cost controls, observability, and rollback.

The durable product rule remains: model output is a candidate for review, never
inventory truth.
