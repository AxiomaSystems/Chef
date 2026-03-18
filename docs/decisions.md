# 🧠 Engineering Decisions — Cart Generator

This document captures the **key architectural and product decisions** behind Cart Generator.

Its purpose is to:

* make implicit assumptions explicit
* prevent regressions in design
* align contributors on system philosophy
* provide strong engineering signal

---

# 🧭 Core Philosophy

Cart Generator is built as:

> A **stateful decision system** that transforms stable user habits into constrained economic outputs (grocery carts).

---

# ⚖️ Decision 1 — Stateful System over Stateless Generation

## Decision

The system stores and operates on **persistent user-owned recipes**, instead of generating everything from scratch each time.

## Why

* Real users repeat meals and reuse knowledge
* Stateless generation creates inconsistent outputs
* Persistence enables accumulation and optimization

## Trade-off

* Requires database modeling early
* Adds complexity to system design

## Result

* Introduced `BaseRecipe`, `RecipeVariant`, `CartDraft`

---

# ⚖️ Decision 2 — LLM as Transformation Layer (Not Core Logic)

## Decision

LLM is used only to **transform structured inputs**, not to drive the entire system.

## Allowed Uses

* recipe adaptation
* structured generation
* ingredient interpretation

## Forbidden Uses

* aggregation
* pricing
* product matching
* orchestration

## Why

* LLM outputs are non-deterministic
* Core system must be reproducible
* Debugging requires traceable logic

## Result

* Deterministic pipeline preserved
* AI constrained to well-defined boundaries

---

# ⚖️ Decision 3 — BaseRecipe vs RecipeVariant Separation

## Decision

Recipes are split into:

* immutable base recipes
* derived variants

## Why

* prevents loss of original identity
* enables caching and reuse
* allows tracking transformations

## Trade-off

* additional complexity in data model

## Result

* `BaseRecipe` remains stable
* `RecipeVariant` captures adaptation logic

---

# ⚖️ Decision 4 — Deterministic Aggregation Layer

## Decision

Ingredient aggregation is fully deterministic.

## Why

* must be mathematically correct
* must be debuggable
* cannot depend on AI variability

## Responsibilities

* merge ingredients
* sum quantities
* normalize units

## Result

* Introduced `AggregatedIngredient`
* Clear boundary between input and output

---

# ⚖️ Decision 5 — Separate Culinary and Retail Domains

## Decision

Split system into:

* **culinary domain** (recipes, ingredients)
* **retail domain** (products, pricing)

## Why

* different logic and constraints
* avoids mixing concerns
* enables independent evolution

## Trade-off

* requires mapping layer (matching)

## Result

* `DishIngredient` ≠ `Product`
* Introduced matching pipeline

---

# ⚖️ Decision 6 — Product Matching is Deterministic (Not LLM-driven)

## Decision

Product selection is handled via scoring logic, not AI.

## Why

* pricing must be consistent
* AI hallucination risk is high
* scoring logic is explainable

## Signals used

* name similarity
* size compatibility
* price efficiency

## Result

* `ProductCandidate`
* `MatchedIngredientProduct`

---

# ⚖️ Decision 7 — Use Canonical Ingredient Naming

## Decision

All ingredients are normalized into a canonical form.

## Why

* aggregation requires identity consistency
* matching requires stable keys
* prevents duplication

## Example

```text id="4x08cr"
"chicken breast" → canonical_ingredient
"boneless chicken breast" → display_ingredient
```

## Result

* Canonical layer becomes backbone of system

---

# ⚖️ Decision 8 — Use Monorepo with Shared Types

## Decision

All apps share a central TypeScript package.

## Why

* prevents schema drift
* ensures API consistency
* improves dev velocity

## Result

```text id="o4y3xg"
packages/shared/
```

---

# ⚖️ Decision 9 — NestJS for Backend Architecture

## Decision

Backend is built using NestJS modular architecture.

## Why

* enforces separation of concerns
* scales better than ad-hoc Express
* aligns with production backend patterns

## Result

* modules: recipe, cart, aggregation, matching, llm

---

# ⚖️ Decision 10 — PostgreSQL over NoSQL

## Decision

Use relational database (PostgreSQL).

## Why

* strong relationships (recipes ↔ ingredients ↔ carts)
* need for joins and constraints
* structured data model

## Trade-off

* less flexible than NoSQL
* requires schema design

---

# ⚖️ Decision 11 — Redis for Async + Caching (Planned)

## Decision

Use Redis for:

* caching
* background jobs

## Why

* product matching can be expensive
* LLM calls can be cached
* supports async pipelines

---

# ⚖️ Decision 12 — Docker for Local Infra

## Decision

Use Docker for:

* Postgres
* Redis

## Why

* consistent environment
* easier onboarding
* reproducibility

---

# ⚖️ Decision 13 — Separate Models by Domain

## Decision

Models are grouped into:

* recipe
* selection
* aggregation
* product
* cart

## Why

* prevents “God objects”
* keeps boundaries clear
* improves maintainability

---

# ⚖️ Decision 14 — Structured Data over Free Text

## Decision

All core data must be structured.

## Why

* enables deterministic computation
* avoids parsing complexity
* ensures type safety

## Result

* all LLM outputs must conform to schema

---

# ⚖️ Decision 15 — Build Pipeline First, UI Second

## Decision

Focus on backend pipeline before UI complexity.

## Why

* core value is system logic
* UI can be layered later
* prevents premature optimization

---

# ⚖️ Decision 16 — Mock Retailer First, Real Integration Later

## Decision

Start with mock product dataset.

## Why

* avoids early API complexity
* enables rapid iteration
* isolates matching logic

---

# ⚖️ Decision 17 — Avoid Over-Engineering Early

## Decision

Delay:

* microservices
* multi-retailer support
* advanced optimization

## Why

* MVP needs a working pipeline first
* complexity compounds quickly

---

# ⚖️ Decision 18 — Explicit Boundaries Between Layers

## Decision

Each layer must have:

* clear inputs
* clear outputs
* no hidden dependencies

## Why

* easier debugging
* easier scaling
* easier testing

---

# 🧭 Summary

The system is intentionally designed as:

* **stateful**
* **layered**
* **deterministic at its core**
* **AI-assisted but not AI-dependent**

These decisions ensure that Cart Generator evolves into:

> A reliable, extensible system that translates human habits into structured economic actions.

---
