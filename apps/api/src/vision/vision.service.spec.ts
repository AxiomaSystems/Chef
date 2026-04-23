import { MockVisionDetectorProvider } from './mock-vision-detector.provider';
import { VisionService } from './vision.service';

describe('VisionService', () => {
  const service = new VisionService(new MockVisionDetectorProvider());

  it('describes a detection-only stage-1 pipeline', () => {
    const pipeline = service.describePipeline();

    expect(pipeline.provider).toBe('mock-stage1-detector');
    expect(pipeline.stage).toBe('detection_only');
    expect(pipeline.tracking_enabled).toBe(false);
    expect(pipeline.supported_classes.some((entry) => entry.id === 'onion')).toBe(true);
  });

  it('analyzes debug-object scans and separates track from review labels', async () => {
    const result = await service.analyzeScan({
      scan_session_id: 'scan_test_1',
      frames: [
        {
          frame_id: 1,
          zone_id: 'closet_left_top',
          debug_objects: [
            { label: 'olive oil bottle', confidence: 0.97 },
            { label: 'plate', confidence: 0.88 },
            { label: 'mystery thing', confidence: 0.51 },
          ],
        },
      ],
      options: {
        include_ignored: false,
      },
    });

    expect(result.summary.frame_count).toBe(1);
    expect(result.summary.detection_count).toBe(2);
    expect(result.summary.track_candidate_count).toBe(1);
    expect(result.summary.review_candidate_count).toBe(1);
    expect(result.summary.ignored_detection_count).toBe(0);
    expect(result.frames[0].detections.map((detection) => detection.label)).toEqual([
      'olive oil bottle',
      'unknown kitchen item',
    ]);
  });

  it('infers closed-set labels from frame_ref text when debug objects are absent', async () => {
    const result = await service.analyzeScan({
      scan_session_id: 'scan_test_2',
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
      'milk carton',
      'egg carton',
    ]);
    expect(result.frames[1].detections.map((detection) => detection.label)).toEqual([
      'bottle',
      'jar',
    ]);
  });
});
