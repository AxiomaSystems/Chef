import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  VisionPipelineConfigResponseDto,
  VisionScanResponseDto,
} from '../common/http/swagger.dto';
import {
  analyzeVisionScanRequestExample,
  badRequestErrorExample,
  visionPipelineExample,
  visionScanResponseExample,
} from '../common/http/swagger.examples';
import { AnalyzeVisionScanDto } from './dto/analyze-vision-scan.dto';

export const ApiVisionController = () => applyDecorators(ApiTags('vision'));

export const ApiDescribeVisionPipeline = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'Describe the current stage-1 kitchen vision pipeline and supported classes',
    }),
    ApiOkResponse({
      description: 'Current vision pipeline config',
      type: VisionPipelineConfigResponseDto,
      content: {
        'application/json': {
          examples: {
            visionPipeline: {
              summary: 'Stage-1 vision pipeline',
              value: visionPipelineExample,
            },
          },
        },
      },
    }),
  );

export const ApiAnalyzeVisionScan = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'Run the stage-1 detector over a scan session and return frame-level observations',
    }),
    ApiBody({
      type: AnalyzeVisionScanDto,
      required: true,
      examples: {
        stage1Scan: {
          summary: 'Analyze a short pantry scan',
          value: analyzeVisionScanRequestExample,
        },
      },
    }),
    ApiOkResponse({
      description: 'Frame-level detections for the scan session',
      type: VisionScanResponseDto,
      content: {
        'application/json': {
          examples: {
            scanResponse: {
              summary: 'Stage-1 detection response',
              value: visionScanResponseExample,
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid vision scan payload',
      type: ErrorResponseDto,
      content: {
        'application/json': {
          examples: {
            invalidVisionScan: {
              summary: 'Validation error',
              value: badRequestErrorExample,
            },
          },
        },
      },
    }),
  );
