export type MigrationFingerprint = Readonly<{
  name: string;
  checksum: string;
}>;

/**
 * Versioned metadata for active production fingerprints that are not identical
 * to the current packaged migration history. Keep this list limited to names
 * and SHA-256 checksums verified from the active production ledger.
 */
export const KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1 = [
  {
    name: '20260422120000_add_shopping_cart_external_handoff',
    checksum:
      '60cc958cd97a00027091273ccf76036aede2d9c9cbb224ce4e707dc321473d4c',
  },
  {
    name: '20260422143000_add_kitchen_inventory',
    checksum:
      'e762591332a604cc9e5fcb65b20fd5edeb7b96c753b9378127b79b2558ad1f86',
  },
  {
    name: '20260423090000_add_meal_plan_persistence',
    checksum:
      '61c8dab726df4c1081756e0a71672d267b2b5c6a0aaad790166625c8bf86e6ae',
  },
  {
    name: '20260423093000_add_user_checkout_profile',
    checksum:
      '3cf07c6067ac838061c968695e373271f27533585f29ef9d11365d629841ca2a',
  },
  {
    name: '20260429120000_add_user_onboarding_profile',
    checksum:
      '657c9498a6c39c69870a5ee452ebe6e1ebbb52c8bbaa91c01f017e11abef905e',
  },
  {
    name: '20260429195446_enoch',
    checksum:
      'b4a5de2f6c08ff15843af3e94d2dde905bfd7e7b95c39865c12848186c7bfe36',
  },
  {
    name: '20260430143000_add_profile_memory_v2',
    checksum:
      'bc9c6735cb13df071d2763beadfa1ca799b4f5bb01d51f15395c0e0a1b6fe3e3',
  },
  {
    name: '20260507010000_add_user_profile_read_indexes',
    checksum:
      '7a2c2a2f3a39302f6303355f0ac7d862020d817df832307df347320ba072df6d',
  },
  {
    name: '20260515120000_active_shopping_cart_lifecycle',
    checksum:
      'c2aa36b6852d3553973ba35743da7fcf05cc8f810de86dcd1b1a1b2c6a288e96',
  },
  {
    name: '20260521190000_add_flexible_meal_events',
    checksum:
      'd649c4e90808c392a7192c355ebcb018c1c9a9c9c235f9ea3b9c63b929a4b80f',
  },
  {
    name: '20260626130000_revoke_supabase_direct_table_grants',
    checksum:
      '36fdeadb97d03fcd189d4f4ade6a409e3cb5eecab18f4f2ede3373060b7baa80',
  },
  {
    name: '20260628120000_add_recipe_execution_metadata',
    checksum:
      '44923a25688e210266a0bd376ca693acbca1e48ca014a8902ce2b90bd7d5dfb9',
  },
] as const satisfies readonly MigrationFingerprint[];
