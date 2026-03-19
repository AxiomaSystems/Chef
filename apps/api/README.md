# API

NestJS backend for Cart Generator.

## What Exists

- recipe CRUD with ownership rules
- system recipes plus user-owned recipes
- cart draft persistence
- generated cart persistence and history
- deterministic aggregation
- mock product matching with basic unit conversion
- Swagger/OpenAPI docs
- request logging with `x-request-id`

## Run Locally

From the repo root:

```bash
pnpm dev:api
```

Or from this folder:

```bash
pnpm start:dev
```

The API listens on `http://localhost:3001` by default.

## Documentation

Swagger UI:

```text
http://localhost:3001/docs
```

OpenAPI JSON:

```text
http://localhost:3001/docs/openapi.json
```

The Swagger UI includes:

- request examples for `POST` and `PATCH` endpoints
- response examples for success and error cases
- example header usage for `x-user-id`

## Dev Headers

The API currently supports a development-only actor override header:

```text
x-user-id: user-1
```

If `x-user-id` is omitted, the backend falls back to the seeded dev user.

Every response also includes:

```text
x-request-id: <generated-or-forwarded-id>
```

You can pass your own request id and the API will reuse it:

```text
x-request-id: req-local-123
```

## Local Workflow

1. Start PostgreSQL:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

2. Generate Prisma client:

```bash
pnpm prisma:generate
```

3. Run migrations:

```bash
pnpm prisma:migrate:dev
```

4. Seed local data:

```bash
pnpm db:seed
```

5. Start the API:

```bash
pnpm start:dev
```

## Example Requests

List visible recipes:

```bash
curl -H "x-user-id: user-1" http://localhost:3001/recipes
```

Create a recipe:

```bash
curl -X POST http://localhost:3001/recipes ^
  -H "Content-Type: application/json" ^
  -H "x-user-id: user-1" ^
  -d "{\"name\":\"Arroz con pollo casero\",\"cuisine\":\"Peruvian\",\"description\":\"Comforting chicken and rice dish.\",\"servings\":4,\"ingredients\":[{\"canonical_ingredient\":\"rice\",\"amount\":2,\"unit\":\"cup\"},{\"canonical_ingredient\":\"chicken thigh\",\"amount\":800,\"unit\":\"g\"}],\"steps\":[{\"step\":1,\"what_to_do\":\"Brown the chicken thighs.\"}],\"tags\":[\"dinner\"]}"
```

Generate a cart:

```bash
curl -X POST http://localhost:3001/cart/generate ^
  -H "Content-Type: application/json" ^
  -H "x-user-id: user-1" ^
  -H "x-request-id: req-local-123" ^
  -d "{\"selections\":[{\"recipe_id\":\"recipe-1\",\"recipe_type\":\"base\",\"quantity\":2,\"servings_override\":4}],\"retailer\":\"walmart\"}"
```

Get generated cart history:

```bash
curl -H "x-user-id: user-1" http://localhost:3001/cart/generated/history
```

## Tests

```bash
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
pnpm build
```
