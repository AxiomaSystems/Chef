import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  VisionPipelineConfigResponseDto,
  VisionScanResponseDto,
} from '../common/http/swagger.dto';
import {
  visionPipelineExample,
  visionScanRequestExample,
  visionScanResponseExample,
} from '../common/http/swagger.examples';
import { AnalyzeVisionScanDto } from './dto/analyze-vision-scan.dto';

export const ApiVisionController = () => applyDecorators(ApiTags('vision'));

export const ApiDescribeVisionPipeline = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Describe the active vision detection pipeline',
      description:
        'Returns the product-facing vision contract and stage-1 ontology. The current implementation is a mock detector boundary designed for integration before the Python/YOLO service is wired in.',
    }),
    ApiOkResponse({
      description: 'Vision pipeline configuration',
      type: VisionPipelineConfigResponseDto,
      content: {
        'application/json': {
          examples: {
            pipeline: {
              summary: 'Stage-1 mock pipeline',
              value: visionPipelineExample,
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiAnalyzeVisionScan = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Analyze a pantry or kitchen scan',
      description:
        'Accepts frame metadata/debug objects and returns frame-level detections plus track/review/ignore summary counts. This endpoint does not write inventory yet.',
    }),
    ApiBody({
      type: AnalyzeVisionScanDto,
      required: true,
      examples: {
        pantryScan: {
          summary: 'Pantry scan with debug objects',
          value: visionScanRequestExample,
        },
      },
    }),
    ApiOkResponse({
      description: 'Vision scan response',
      type: VisionScanResponseDto,
      content: {
        'application/json': {
          examples: {
            scan: {
              summary: 'Vision scan response',
              value: visionScanResponseExample,
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );
