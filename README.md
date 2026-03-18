# 🛒 Cart Generator

**Cart Generator** is a full-stack system that transforms a user’s **saved recipes and constraints into a structured grocery cart**, combining persistent recipe memory, deterministic backend logic, and LLM-based adaptation.

---

## 🧠 Core Idea

This project is **not** a generic AI meal planner.

It is a **stateful decision system** built around:

* **Recipe memory (what users actually eat)**
* **Constraint adaptation (diet, cost, preferences)**
* **Cart generation (real-world output)**

---

## 🔁 Core System Flow

```text
Saved Recipes → Selection → Optional Adaptation → Ingredient Extraction → Consolidation → Product Matching → Cost Estimation → Cart
```

---

## 🎯 Purpose

The system is designed to:

* Model **real-world food consumption patterns** (repetition, variation, constraints)
* Reduce reliance on raw LLM generation
* Demonstrate **production-grade backend architecture**
* Combine:

  * structured data systems
  * AI-assisted transformations
  * optimization pipelines

---

## 🧩 Key Conceptual Layers

### 1. Base Recipes (Persistent Layer)

Represents stable, user-owned dishes.

Examples:

* Ají de gallina
* Ceviche
* Lomo saltado

Each base recipe includes:

* name
* ingredients
* quantities
* preparation steps
* metadata (tags, cuisine, etc.)

---

### 2. Recipe Variants (Transformation Layer)

Derived versions of base recipes under constraints.

Examples:

* cheaper version
* halal version
* vegan version
* 600–800 kcal version

Variants are generated via **LLM-assisted transformation**, but remain structured.

---

### 3. Selection Layer

Users select multiple recipes to build a weekly or session-based plan.

This reflects real behavior:

* repetition
* partial variation
* stable preferences

---

### 4. Cart Generation Layer

Selected recipes are transformed into:

* aggregated ingredients
* normalized units
* matched products
* estimated total cost

---

## ⚙️ Tech Stack

### Frontend

* **Next.js (App Router)**
* **TypeScript**
* **Tailwind CSS**

### Backend

* **NestJS**
* **TypeScript**
* Modular architecture (controllers, services, DTOs)

### Data Layer

* **PostgreSQL**
* **Prisma ORM**

### Async / Caching

* **Redis**
* **BullMQ (planned)**

### AI Layer

* **OpenAI API**
* Structured outputs (JSON)
* Deterministic post-processing

### Monorepo

* **pnpm workspaces**

### Infrastructure

* **Docker (planned for local orchestration)**

---

## 🏗️ Repository Structure

```text
cart-generator/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # NestJS backend
├── packages/
│   └── shared/     # Shared TypeScript types
├── infra/
│   └── docker/     # Docker configs
├── pnpm-workspace.yaml
└── package.json
```

---

## 🧱 System Architecture (Target)

### Entities

* `BaseRecipe`
* `RecipeVariant`
* `Ingredient`
* `RecipeIngredient`
* `CartDraft` (or WeeklySelection)
* `CartItem`
* `Product`

---

### Relationships

* BaseRecipe → has many → RecipeIngredients
* BaseRecipe → has many → RecipeVariants
* CartDraft → has many → Recipes (base or variant)
* Recipe → has many → Ingredients
* Ingredients → map to → Products
* Products → aggregate into → CartItems

---

## 🤖 Role of AI

LLM is used as a **transformation layer**, not the core system.

### Responsibilities

* Adapt recipes under constraints
* Normalize ingredient descriptions
* Suggest substitutions

### Not responsible for

* pricing logic
* product matching decisions
* aggregation
* optimization

👉 Core system remains **deterministic and auditable**

---

## 🚧 Features Roadmap

### Phase 1 — Core System (Current Focus)

* [ ] Create and store base recipes
* [ ] Display saved recipes (menu UI)
* [ ] Select multiple recipes for a cart
* [ ] Extract and normalize ingredients
* [ ] Consolidate ingredient list
* [ ] Mock product catalog
* [ ] Product matching logic
* [ ] Cost estimation
* [ ] End-to-end cart generation

---

### Phase 2 — Adaptation Layer

* [ ] “Adapt recipe” feature (LLM)

  * cheaper
  * halal
  * vegan
  * calorie range
* [ ] Store recipe variants
* [ ] Cache transformations
* [ ] Track adaptation metadata

---

### Phase 3 — Persistence & UX Expansion

* [ ] Save generated carts
* [ ] View past carts
* [ ] Edit / replace products
* [ ] Regenerate selected recipes
* [ ] Improve ingredient normalization

---

### Phase 4 — System Maturity

* [ ] Redis caching
* [ ] Background job processing (BullMQ)
* [ ] Retry and fault tolerance
* [ ] Logging / observability
* [ ] API validation layers

---

### Phase 5 — Advanced Features

* [ ] Real retailer integration (Walmart, etc.)
* [ ] Budget optimization engine
* [ ] Ingredient substitution system
* [ ] Multi-user support (auth)
* [ ] Personalized recommendations

---

## 👥 Team

### @postigodev — Backend & Systems Lead

* Backend architecture (NestJS)
* Database design (Postgres + Prisma)
* Orchestration pipeline
* Infrastructure (Docker, Redis)
* API contracts and data flow

### @galgallor — AI & Intelligence Lead

* LLM integration (OpenAI)
* Recipe adaptation logic
* Ingredient normalization
* Product matching and scoring
* Intelligent transformation pipelines

---

## 🚀 Getting Started

### Install dependencies

```bash
pnpm install
```

### Run backend

```bash
cd apps/api
pnpm run start:dev
```

### Run frontend

```bash
cd apps/web
pnpm dev
```

---

## 🔌 API (Current)

### Generate Plan (stub)

```http
POST /plan/generate
```

Example request:

```json
{
  "budget": 50,
  "people": 2,
  "days": 3
}
```

---

## 🧠 Design Principles

* **Stateful over stateless systems**
* **User memory over constant generation**
* **Deterministic core over AI chaos**
* **Structured data over raw text**
* **Separation of concerns (AI vs system logic)**
* **Production-oriented design from day one**

---

## 🔥 Vision

Cart Generator aims to become:

> A system that transforms stable human habits and constraints into optimized economic decisions.

Not:

* a chatbot
* a recipe generator
* or a grocery list tool

But:

* a **decision engine grounded in real consumption patterns**

---

## 📌 Status

🟢 Monorepo initialized
🟢 Frontend + backend connected
🟡 Core pipeline in development
🔴 Recipe system + cart generation pending

---

## 🧭 Next Steps

* Implement database schema (Prisma)
* Build BaseRecipe CRUD
* Implement ingredient extraction + consolidation
* Add product matching layer
* Introduce LLM adaptation pipeline

---
