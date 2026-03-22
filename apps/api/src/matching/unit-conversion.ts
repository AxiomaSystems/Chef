const MASS_CONVERSIONS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_CONVERSIONS: Record<string, number> = {
  tsp: 1,
  tbsp: 3,
  cup: 48,
  pint: 96,
  qt: 192,
  l: 202.884,
  ml: 0.202884,
};

const COUNT_CONVERSIONS: Record<string, number> = {
  unit: 1,
};

const UNIT_ALIASES: Record<string, string> = {
  ounce: 'oz',
  ounces: 'oz',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  milligram: 'mg',
  milligrams: 'mg',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  cups: 'cup',
  pints: 'pint',
  quart: 'qt',
  quarts: 'qt',
  liter: 'l',
  liters: 'l',
  milliliter: 'ml',
  milliliters: 'ml',
  each: 'unit',
  ea: 'unit',
  units: 'unit',
  ct: 'unit',
  count: 'unit',
  piece: 'unit',
  pieces: 'unit',
};

const UNIT_GROUPS = [MASS_CONVERSIONS, VOLUME_CONVERSIONS, COUNT_CONVERSIONS];

const normalizeUnitName = (unit: string) =>
  UNIT_ALIASES[unit.toLowerCase()] ?? unit.toLowerCase();

export const convertUnit = (
  amount: number,
  fromUnit: string,
  toUnit: string,
): number | null => {
  const normalizedFrom = normalizeUnitName(fromUnit);
  const normalizedTo = normalizeUnitName(toUnit);

  if (normalizedFrom === normalizedTo) {
    return amount;
  }

  for (const group of UNIT_GROUPS) {
    if (group[normalizedFrom] && group[normalizedTo]) {
      const baseAmount = amount * group[normalizedFrom];
      return baseAmount / group[normalizedTo];
    }
  }

  return null;
};
