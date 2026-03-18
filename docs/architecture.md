# 🧱 Architecture — Cart Generator

## 🧠 Overview

Cart Generator is a **layered decision system** that transforms:

> **user-selected recipes + constraints → structured grocery cart**

The architecture is designed to separate:

* **stable user data (recipes)**
* **transformations (LLM-assisted)**
* **deterministic computation (aggregation, matching)**
* **external mapping (retailer products)**

---

## 🔁 End-to-End Pipeline

```text
Base Recipes
   ↓
Recipe Selection (CartDraft)
   ↓
Optional Adaptation (LLM)
   ↓
Normalized Dishes
   ↓
Ingredient Aggregation
   ↓
Product Matching
   ↓
Cost Estimation
   ↓
Generated Cart
```

---

## 🧩 Core Architectural Principle

> The system is **stateful and deterministic at its core**, with AI used only for controlled transformations.

---

## 🏗️ System Layers

---

### 1. Recipe Layer (Persistent Domain)

**Purpose:**
Represents stable, reusable culinary knowledge owned by the user.

**Entities:**

* `BaseRecipe`
* `DishIngredient`
* `RecipeStep`

**Characteristics:**

* Fully deterministic
* Stored in database
* Not generated per request
* Represents real-world eating habits

---

### 2. Selection Layer (User Intent)

**Purpose:**
Captures what the user wants to cook in a given session (e.g. weekly plan).

**Entities:**

* `CartDraft`
* `SelectedRecipe`

**Responsibilities:**

* Select recipes (base or variant)
* Define quantities (repetition)
* Apply per-selection constraints

**Key idea:**

> Users operate over a **set of known recipes**, not abstract prompts.

---

### 3. Adaptation Layer (LLM Transformation)

**Purpose:**
Modify recipes under constraints without losing their identity.

**Examples:**

* make cheaper
* make halal
* make vegan
* adjust calorie range

**Entities:**

* `RecipeVariant`
* `RecipeAdaptationRequest`

**Behavior:**

* Input: BaseRecipe + constraints
* Output: structured variant
* Stored optionally (caching)

**Important:**

* LLM output is **validated and normalized**
* Never directly trusted as final state

---

### 4. Dish Normalization Layer

**Purpose:**
Convert recipes into a consistent, computation-ready format.

**Responsibilities:**

* canonical ingredient naming
* unit normalization
* quantity normalization
* cleanup of ambiguous fields

**Output:**

* normalized `Dish[]`

---

### 5. Aggregation Layer (Deterministic Core)

**Purpose:**
Transform multiple dishes into a single consolidated ingredient list.

**Entities:**

* `AggregatedIngredient`

**Responsibilities:**

* merge identical ingredients
* sum quantities
* track source dishes
* generate purchase hints

**Key principle:**

> No AI here — purely deterministic logic

---

### 6. Product Matching Layer

**Purpose:**
Map ingredients to real-world purchasable products.

**Sub-steps:**

1. generate search queries
2. retrieve candidate products (mock or real)
3. score candidates
4. select best match

**Entities:**

* `ProductCandidate`
* `MatchedIngredientProduct`

**Scoring signals:**

* name similarity
* size compatibility
* price efficiency
* brand relevance (optional)

---

### 7. Cart Layer (Final Output)

**Purpose:**
Produce a structured, user-consumable cart.

**Entity:**

* `GeneratedCart`

**Contains:**

* dishes
* aggregated ingredients
* matched products
* cost estimate

---

## ⚙️ Service Architecture (Backend)

Built with **NestJS modular design**.

### Modules (planned)

```text
api/
├── recipe/
├── variant/
├── cart/
├── aggregation/
├── matching/
├── llm/
```

---

### Responsibilities

| Module      | Responsibility             |
| ----------- | -------------------------- |
| recipe      | CRUD for base recipes      |
| variant     | adaptation logic + caching |
| cart        | orchestration entry point  |
| aggregation | ingredient consolidation   |
| matching    | product selection          |
| llm         | OpenAI interaction         |

---

## 🔌 API Flow

### Main Endpoint

```http
POST /cart/generate
```

### Flow

```text
Request → CartService
        → RecipeService
        → (optional) LLMService
        → AggregationService
        → MatchingService
        → Response
```

---

## 🗄️ Data Flow vs Control Flow

### Control Flow

Driven by:

* API request
* user selection
* explicit constraints

### Data Flow

Moves through:

* recipe → dish → ingredient → product → cart

---

## 🤖 AI Boundary

### LLM is used ONLY for:

* recipe adaptation
* ingredient interpretation (optional)
* structured generation

### LLM is NOT used for:

* aggregation
* pricing
* product selection
* system orchestration

---

## ⚡ Sync vs Async Boundaries

### Synchronous (initial MVP)

* cart generation
* aggregation
* matching (mock)

### Asynchronous (future)

* product search at scale
* caching variants
* recomputing carts
* price updates

**Tools:**

* Redis
* BullMQ

---

## 🧱 Infrastructure Layer

### Local Development

* Docker (Postgres + Redis)

### Services

* PostgreSQL → persistence
* Redis → cache + queue
* OpenAI → LLM

---

## 🔐 State vs Computation

| Type             | Examples                             |
| ---------------- | ------------------------------------ |
| Persistent State | BaseRecipe, RecipeVariant, CartDraft |
| Derived State    | AggregatedIngredient, GeneratedCart  |
| Ephemeral        | product candidates, raw LLM output   |

---

## 🧠 Design Principles

### 1. Deterministic Core

All critical logic:

* aggregation
* pricing
* selection
  must be reproducible.

---

### 2. LLM as Transformation Layer

AI modifies structured inputs — it does not replace system logic.

---

### 3. Separation of Concerns

Clear boundaries between:

* recipe logic
* AI logic
* aggregation logic
* product logic

---

### 4. Stateful System

User behavior accumulates over time:

* saved recipes
* reused variants
* repeated selections

---

### 5. Composability

Each layer can evolve independently:

* better matching
* better normalization
* better adaptation

---

## 🔮 Evolution Path

### Phase 1

* deterministic pipeline
* mock product matching

### Phase 2

* variant caching
* improved normalization

### Phase 3

* real retailer integration
* async jobs

### Phase 4

* optimization engine
* personalization

---

## 🧭 Summary

Cart Generator is architected as:

> A modular, stateful system where **user-owned recipes + constraints are transformed into economic decisions (carts)** through a pipeline combining deterministic logic and controlled AI transformations.

---
