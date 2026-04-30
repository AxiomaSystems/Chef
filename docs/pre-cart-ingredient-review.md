# Pre-Cart Ingredient Review

## Goal

Let users review the aggregated ingredient list before generating a retailer shopping cart. This is a per-cart checkpoint, not a permanent kitchen inventory system.

The demo value is simple: after selecting recipes, the user can say “I already have rice,” “skip cilantro,” or “only buy half the chicken,” and the generated shopping cart respects those decisions before product matching or Instacart handoff.

## API Contract

### Get Review

```http
GET /api/v1/carts/:id/ingredient-review
Authorization: Bearer <token>
```

Returns the cart’s current aggregated ingredients plus saved review decisions. If no review exists yet, every item defaults to `buy`.

```json
{
  "cart_id": "cart-1",
  "items": [
    {
      "canonical_ingredient": "chicken thigh",
      "total_amount": 800,
      "unit": "g",
      "source_dishes": [
        {
          "dish_name": "Arroz con pollo casero",
          "amount": 800,
          "unit": "g"
        }
      ],
      "action": "buy"
    }
  ]
}
```

### Save Review

```http
PUT /api/v1/carts/:id/ingredient-review
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "items": [
    {
      "canonical_ingredient": "chicken thigh",
      "unit": "g",
      "action": "adjust",
      "adjusted_amount": 400,
      "adjusted_unit": "g"
    },
    {
      "canonical_ingredient": "rice",
      "unit": "cup",
      "action": "already_have"
    },
    {
      "canonical_ingredient": "cilantro",
      "unit": "g",
      "action": "skip"
    }
  ]
}
```

Supported actions:

- `buy`: keep the ingredient in the generated shopping cart.
- `already_have`: exclude the ingredient from product matching and mark it as in kitchen for this cart.
- `skip`: exclude the ingredient from product matching without implying inventory ownership.
- `adjust`: replace the aggregated amount/unit before product matching.

Validation rules:

- Unknown `canonical_ingredient + unit` pairs are rejected.
- `adjusted_amount` is required when `action` is `adjust`.
- Review state is scoped to one cart and is deleted when the cart is deleted.

## Shopping Cart Generation Behavior

When calling:

```http
POST /api/v1/carts/:cartId/shopping-carts
```

the backend applies the saved ingredient review before retailer matching:

- `already_have` and existing kitchen inventory items are not matched.
- `skip` items are not matched.
- `adjust` items use `adjusted_amount` and `adjusted_unit`.
- The persisted shopping cart `overview` includes `review_action`, and adjusted items include `reviewed_amount` / `reviewed_unit`.

## Frontend Integration Notes

Recommended flow:

1. User creates or opens a persisted cart.
2. Frontend calls `GET /api/v1/carts/:id/ingredient-review`.
3. User reviews ingredients in a modal or dedicated step.
4. Frontend calls `PUT /api/v1/carts/:id/ingredient-review`.
5. Frontend calls `POST /api/v1/carts/:cartId/shopping-carts`.

Keep the UI optimistic but refetch after save, because the backend is the source of truth for the cart’s current aggregated ingredient list.

## Out Of Scope

- Permanent inventory quantities.
- User-level pantry preferences.
- AI substitution suggestions.
- Allergy or macro target enforcement.
- Retailer-specific replacement recommendations.
