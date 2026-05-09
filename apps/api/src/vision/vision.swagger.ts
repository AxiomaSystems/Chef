import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  VisionObservationResponseDto,
  VisionPipelineConfigResponseDto,
  VisionScanResponseDto,
} from '../common/http/swagger.dto';
import {
  badRequestErrorExample,
  visionPipelineExample,
  visionScanRequestExample,
  visionScanResponseExample,
} from '../common/http/swagger.examples';
import { AddVisionObservationToInventoryDto } from './dto/add-vision-observation-to-inventory.dto';
import { AnalyzeVisionScanDto } from './dto/analyze-vision-scan.dto';
import { CreateVisionObservationDto } from './dto/create-vision-observation.dto';

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
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiListVisionObservations = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List persisted vision observations for the current user',
      description:
        'Returns model evidence rows created from vision review flows. These rows are observations, not canonical ingredients.',
    }),
    ApiOkResponse({
      description: 'Vision observations',
      type: VisionObservationResponseDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiCreateVisionObservation = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a persisted vision observation',
      description:
        'Stores detector/classifier evidence for later user review. This endpoint does not create inventory by itself.',
    }),
    ApiBody({ type: CreateVisionObservationDto, required: true }),
    ApiCreatedResponse({
      description: 'Created vision observation',
      type: VisionObservationResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid vision observation payload',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiAddVisionObservationToInventory = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Convert a reviewed vision observation into inventory',
      description:
        'Creates a kitchen inventory item from an observation after user review. Canonical ingredient linking remains optional.',
    }),
    ApiBody({ type: AddVisionObservationToInventoryDto, required: false }),
    ApiCreatedResponse({
      description: 'Updated vision observation linked to inventory',
      type: VisionObservationResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Observation cannot be converted',
      type: ErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Observation or ingredient not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );

export const ApiDiscardVisionObservation = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Discard a reviewed vision observation',
      description:
        'Marks an observation as discarded without creating inventory.',
    }),
    ApiCreatedResponse({
      description: 'Discarded vision observation',
      type: VisionObservationResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Observation cannot be discarded',
      type: ErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Observation not found',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      type: ErrorResponseDto,
    }),
  );
