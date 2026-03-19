# Postman

Files:

- [cart-generator-api.postman_collection.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-api.postman_collection.json)
- [cart-generator-api-negative.postman_collection.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-api-negative.postman_collection.json)
- [cart-generator-local.postman_environment.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-local.postman_environment.json)

## Import Order

1. Import the environment.
2. Import the collection.
3. Select the `Cart Generator Local` environment.

## Default Dev Identity

The collection uses:

```text
x-user-id: postigodev@cart-generator.local
```

## Suggested Run Order

Recipes:

1. `List Recipes (Authenticated)`
2. `List Recipes (Unauthenticated)`
3. `Create Recipe`
4. `Get Recipe By Id`
5. `Update Recipe`
6. `Save System Recipe`
7. `Get Saved Recipe Origin`

Cart:

1. `Create Draft`
2. `List Drafts`
3. `Get Draft By Id`
4. `Generate Cart`
5. `List Generated Cart History`
6. `List Generated Carts`
7. `Get Generated Cart By Id`

Notes:

- request tests automatically persist ids into collection variables
- `Delete Recipe` is intentionally separate so you can run it only when you want cleanup
- the negative collection is meant to be run separately from the happy-path collection
