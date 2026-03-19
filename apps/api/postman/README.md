# Postman

Import these files into Postman:

- [cart-generator-api.postman_collection.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-api.postman_collection.json)
- [cart-generator-local.postman_environment.json](/C:/Users/akuma/repos/cart-generator/apps/api/postman/cart-generator-local.postman_environment.json)

Suggested order:

1. `Recipes / Create Recipe`
2. `Cart / Generate Cart`
3. `Cart / List Generated Cart History`
4. `Cart / List Generated Carts`
5. `Cart / Get Generated Cart By Id`
6. `Cart / List Cart Drafts`
7. `Cart / Get Cart Draft By Id`

The collection uses these variables:

- `baseUrl`
- `userId`
- `requestId`
- `recipeId`
- `cartDraftId`
- `generatedCartId`

Tests inside the requests update those ids automatically when responses include them.
