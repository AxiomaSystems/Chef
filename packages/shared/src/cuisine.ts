export type CuisineKind =
  | 'national'
  | 'regional'
  | 'cultural'
  | 'style'
  | 'other';

export type Cuisine = {
  id: string;
  slug: string;
  label: string;
  kind: CuisineKind;
  created_at: string;
  updated_at: string;
};
