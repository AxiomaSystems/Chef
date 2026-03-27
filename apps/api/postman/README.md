# Postman

Import these files into Postman:

- [cart-generator-api.postman_collection.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-api.postman_collection.json)
- [cart-generator-api-negative.postman_collection.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-api-negative.postman_collection.json)
- [cart-generator-local.postman_environment.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-local.postman_environment.json)

Suggested order:

1. `Auth / Login`
2. `Taxonomies / List Cuisines`
3. `Taxonomies / List Tags`
4. `Taxonomies / Create User Tag`
5. `Me / Get Me`
6. `Me / Put Preferences`
7. `Recipes / List Recipes (Public)`
8. `Recipes / Create Recipe`
9. `Cart / Create Cart`
10. `Cart / Create Shopping Cart`
11. `Cart / Search Retailer Products`

Negative collection:

1. `Setup / Auth / Login`
2. `Setup / Recipes / List Recipes (authenticated)`
3. `Setup / Tags / Create User Tag`
4. `Negative / ...`

Static config variables:

- `baseUrl`
- `requestId`
- `authEmail`
- `authPassword`

Runtime collection variables created by the request scripts:

- `accessToken`
- `refreshToken`
- `cuisineId`
- `systemTagId`
- `userTagId`
- `systemRecipeId`
- `recipeId`
- `cartId`
- `shoppingCartId`

Tests inside the requests update tokens and ids automatically when responses include them.

Notes:

- the collection targets the current `/api/v1` contract
- authenticated requests use `Authorization: Bearer {{accessToken}}`
- the happy-path collection uses the seeded local dev user by default:
  - `authEmail = postigodev@cart-generator.local`
  - `authPassword = postigodev123`
- the negative collection also assumes the seeded local dev user exists
- `Negative / Me / Put Preferences With User Tag -> 403` assumes `Setup / Tags / Create User Tag` has already run

CLI / Newman:

- from the repo root: `pnpm postman:test`
- directly in `apps/api`: `pnpm postman:test`

Prerequisites:

- the API is running at `http://localhost:3001`
- local migrations are applied
- local seed data exists so cuisines, system tags, and system recipes are available

Recommended root flow before running Newman:

1. `pnpm api:setup`
2. `pnpm api:up`
3. in another terminal: `pnpm postman:test`
