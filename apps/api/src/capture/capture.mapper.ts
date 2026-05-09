import type {
  Capture,
  CaptureRecipePreview,
  CaptureSourceAttribution,
} from '@cart/shared';

type CaptureRecord = {
  id: string;
  userId: string;
  inputKind: Capture['input_kind'];
  sourceKind: Capture['source_kind'];
  resultKind: Capture['result_kind'];
  status: Capture['status'];
  confidence: Capture['confidence'];
  needsReview: boolean;
  savedRecipeId: string | null;
  sourceUrl: string | null;
  sourceTextSnippet: string | null;
  attribution: unknown;
  recipePreview: unknown;
  assumptions: unknown;
  missingInfo: unknown;
  nextActions: unknown;
  extractionNotes: unknown;
  shortSnippets: unknown;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapCapture(input: CaptureRecord): Capture {
  return {
    id: input.id,
    user_id: input.userId,
    input_kind: input.inputKind,
    source_kind: input.sourceKind,
    result_kind: input.resultKind,
    status: input.status,
    confidence: input.confidence,
    needs_review: input.needsReview,
    saved_recipe_id: input.savedRecipeId ?? undefined,
    source_url: input.sourceUrl ?? undefined,
    source_text_snippet: input.sourceTextSnippet ?? undefined,
    source_attribution: input.attribution as CaptureSourceAttribution,
    recipe_preview:
      (input.recipePreview as CaptureRecipePreview | null) ?? undefined,
    assumptions: stringArray(input.assumptions),
    missing_info: stringArray(input.missingInfo),
    next_actions: stringArray(input.nextActions),
    extraction_notes: stringArray(input.extractionNotes),
    short_snippets: stringArray(input.shortSnippets),
    error_message: input.errorMessage ?? undefined,
    created_at: input.createdAt.toISOString(),
    updated_at: input.updatedAt.toISOString(),
  };
}

function stringArray(input: unknown): string[] {
  return Array.isArray(input)
    ? input.filter((value): value is string => typeof value === 'string')
    : [];
}
