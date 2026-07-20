import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { VisionObservation } from '@cart/shared';
import type { Prisma } from '../../generated/prisma';
import { IngredientsService } from '../ingredients/ingredients.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AddVisionObservationToInventoryDto } from './dto/add-vision-observation-to-inventory.dto';
import type { CreateVisionObservationDto } from './dto/create-vision-observation.dto';
import { mapVisionObservation } from './vision-observations.mapper';

@Injectable()
export class VisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingredientsService: IngredientsService,
  ) {}

  async createObservation(
    userId: string,
    input: CreateVisionObservationDto,
  ): Promise<VisionObservation> {
    const detectedLabel = input.detected_label.trim();

    if (!detectedLabel) {
      throw new BadRequestException('detected_label is required');
    }

    const observation = await this.prisma.visionObservation.create({
      data: {
        userId,
        detectedLabel,
        proposedName: input.proposed_name?.trim() || undefined,
        canonicalSlug: input.canonical_slug?.trim() || undefined,
        detectorModel: input.detector_model?.trim() || undefined,
        classifierModel: input.classifier_model?.trim() || undefined,
        modelName: input.model_name?.trim() || undefined,
        confidence: input.confidence ?? undefined,
        imageRef: input.image_ref?.trim() || undefined,
        cropRef: input.crop_ref?.trim() || undefined,
        bbox: input.bbox as Prisma.InputJsonValue | undefined,
        rawPayload: input.raw_payload as Prisma.InputJsonValue | undefined,
      },
    });

    return mapVisionObservation(observation);
  }

  async listObservations(userId: string): Promise<VisionObservation[]> {
    const observations = await this.prisma.visionObservation.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return observations.map(mapVisionObservation);
  }

  async addObservationToInventory(
    userId: string,
    id: string,
    input: AddVisionObservationToInventoryDto,
  ): Promise<VisionObservation> {
    const observation = await this.findUserObservationOrThrow(userId, id);

    if (observation.inventoryItemId) {
      throw new BadRequestException('Observation already created inventory');
    }

    if (observation.action === 'discarded') {
      throw new BadRequestException('Discarded observation cannot be added');
    }

    const ingredient = await this.resolveInventoryIngredient(
      input,
      observation,
    );
    const displayName =
      input.display_name?.trim() ||
      observation.proposedName?.trim() ||
      ingredient?.canonicalName ||
      observation.detectedLabel;

    if (!displayName.trim()) {
      throw new BadRequestException('Inventory item name is required');
    }

    const inventoryItem = await this.prisma.kitchenInventoryItem.create({
      data: {
        userId,
        ingredientId: ingredient?.id,
        displayName,
        normalizedName: this.ingredientsService.normalizeName(displayName),
        label: displayName,
        estimatedAmount: input.estimated_amount ?? undefined,
        unit: input.unit?.trim() || undefined,
        source: 'vision',
        confidence: this.inventoryConfidenceFor(observation.confidence),
        reviewStatus: 'active',
      },
    });

    const updated = await this.prisma.visionObservation.update({
      where: { id: observation.id },
      data: {
        inventoryItemId: inventoryItem.id,
        proposedName: displayName,
        canonicalSlug: ingredient?.slug ?? observation.canonicalSlug,
        action: ingredient ? 'resolved_to_ingredient' : 'added_to_inventory',
      },
    });

    return mapVisionObservation(updated);
  }

  async discardObservation(
    userId: string,
    id: string,
  ): Promise<VisionObservation> {
    const observation = await this.findUserObservationOrThrow(userId, id);

    if (observation.inventoryItemId) {
      throw new BadRequestException(
        'Observation already created inventory and cannot be discarded',
      );
    }

    const updated = await this.prisma.visionObservation.update({
      where: { id: observation.id },
      data: { action: 'discarded' },
    });

    return mapVisionObservation(updated);
  }

  private async findUserObservationOrThrow(userId: string, id: string) {
    const observation = await this.prisma.visionObservation.findFirst({
      where: { id, userId },
    });

    if (!observation) {
      throw new NotFoundException(`Vision observation ${id} not found`);
    }

    return observation;
  }

  private async resolveInventoryIngredient(
    input: AddVisionObservationToInventoryDto,
    observation: Awaited<
      ReturnType<VisionService['findUserObservationOrThrow']>
    >,
  ) {
    if (input.ingredient_id) {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: input.ingredient_id },
      });

      if (!ingredient) {
        throw new NotFoundException('Ingredient not found');
      }

      return ingredient;
    }

    const slug = input.canonical_slug?.trim() || observation.canonicalSlug;
    if (slug) {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { slug },
      });

      if (ingredient) {
        return ingredient;
      }
    }

    if (input.canonical_name) {
      return this.ingredientsService.ensureIngredient(input.canonical_name);
    }

    return null;
  }

  private inventoryConfidenceFor(confidence: number | null) {
    if (confidence === null || confidence === undefined) {
      return 'medium';
    }

    if (confidence >= 0.75) {
      return 'high';
    }

    if (confidence < 0.4) {
      return 'low';
    }

    return 'medium';
  }
}
