type ParsedProductSize = {
  sizeValue?: number;
  sizeUnit?: string;
  quantityText?: string;
};

const UNIT_ALIASES: Record<string, string> = {
  mg: 'mg',
  milligram: 'mg',
  milligrams: 'mg',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  'fl oz': 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  pint: 'pint',
  pints: 'pint',
  qt: 'qt',
  quart: 'qt',
  quarts: 'qt',
  each: 'unit',
  ea: 'unit',
  unit: 'unit',
  units: 'unit',
  ct: 'unit',
  count: 'unit',
  piece: 'unit',
  pieces: 'unit',
};

const SIZE_PATTERN =
  /(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ounces?|lbs?|pounds?|kg|kilograms?|g|grams?|mg|milligrams?|ml|milliliters?|liters?|l|tbsp|tablespoons?|tsp|teaspoons?|cups?|pints?|qt|quarts?|each|ea|units?|ct|count|pieces?)/i;
const EACH_PATTERN = /\b(each|ea)\b/i;

export const normalizeMeasurementUnit = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return UNIT_ALIASES[normalized] ?? normalized;
};

export const parseProductSize = (
  ...values: Array<string | undefined>
): ParsedProductSize => {
  for (const rawValue of values) {
    if (!rawValue) {
      continue;
    }

    const value = rawValue.trim();
    const matchedSize = value.match(SIZE_PATTERN);

    if (matchedSize) {
      const parsedValue = Number(matchedSize[1]);
      const parsedUnit = normalizeMeasurementUnit(matchedSize[2]);

      if (Number.isFinite(parsedValue) && parsedUnit) {
        return {
          sizeValue: parsedValue,
          sizeUnit: parsedUnit,
          quantityText: value,
        };
      }
    }

    if (EACH_PATTERN.test(value)) {
      return {
        sizeValue: 1,
        sizeUnit: 'unit',
        quantityText: value,
      };
    }
  }

  return {};
};
