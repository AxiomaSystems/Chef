import { MockVisionDetectorProvider } from './mock-vision-detector.provider';
import { VisionService } from './vision.service';

describe('VisionService', () => {
  let service: VisionService;

  beforeEach(() => {
    service = new VisionService(new MockVisionDetectorProvider());
  });

  it('describes the stage-1 product-facing pipeline', () => {
    const pipeline = service.describePipeline();

    expect(pipeline.provider).toBe('mock-stage1-detector');
    expect(pipeline.stage).toBe('detection_only');
    expect(pipeline.tracking_enabled).toBe(false);
    expect(pipeline.supported_classes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'olive_oil_bottle',
          inventory_policy: 'track',
        }),
        expect.objectContaining({
          id: 'spice_bottle',
          inventory_policy: 'track',
        }),
      ]),
    );
  });

  it('detects track and review candidates from scan frames', async () => {
    const result = await service.analyzeScan({
      scan_session_id: 'scan-1',
      frames: [
        {
          frame_id: 1,
          frame_ref: 'pantry shelf olive oil bottle egg carton',
        },
        {
          frame_id: 2,
          debug_objects: [{ label: 'jar', confidence: 0.71 }],
        },
      ],
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        frame_count: 2,
        detection_count: 3,
        track_candidate_count: 2,
        review_candidate_count: 1,
      }),
    );
    expect(result.summary.detected_labels).toEqual([
      'egg carton',
      'jar',
      'olive oil bottle',
    ]);
  });

  it('excludes ignored detections unless requested', async () => {
    const defaultResult = await service.analyzeScan({
      scan_session_id: 'scan-1',
      frames: [
        {
          frame_id: 1,
          debug_objects: [{ label: 'plate' }],
        },
      ],
    });

    const includeIgnoredResult = await service.analyzeScan({
      scan_session_id: 'scan-1',
      frames: [
        {
          frame_id: 1,
          debug_objects: [{ label: 'plate' }],
        },
      ],
      options: {
        include_ignored: true,
      },
    });

    expect(defaultResult.summary.detection_count).toBe(0);
    expect(includeIgnoredResult.summary).toEqual(
      expect.objectContaining({
        detection_count: 1,
        ignored_detection_count: 1,
      }),
    );
  });

  it('infers all exact closed-set labels from frame_ref text before generic labels', async () => {
    const result = await service.analyzeScan({
      scan_session_id: 'scan-2',
      frames: [
        {
          frame_id: 1,
          frame_ref: 'fridge shelf milk carton egg carton banana',
        },
        {
          frame_id: 2,
          frame_ref: 'counter bottle jar mug',
        },
      ],
      options: {
        include_ignored: false,
      },
    });

    expect(result.frames[0].detections.map((detection) => detection.label)).toEqual([
      'banana',
      'egg carton',
      'milk carton',
    ]);
    expect(result.frames[1].detections.map((detection) => detection.label)).toEqual([
      'bottle',
      'jar',
    ]);
  });
});
