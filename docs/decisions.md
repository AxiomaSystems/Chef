# Engineering Decisions - Cart Generator

This document records the main system decisions behind the project.

## 1. Stateful System Over Stateless Generation

Decision:
- operate on persistent user-owned recipes instead of generating everything from scratch

Why:
- users repeat meals
- persistence improves consistency
- historical data enables future optimization

Trade-off:
- database modeling is required early

## 2. LLM as Transformation Layer

Decision:
- use AI only to transform structured inputs

Allowed:
- recipe adaptation
- structured generation
- ingredient interpretation when needed

Not allowed:
- aggregation
- pricing
- product matching
- orchestration

Why:
- deterministic logic must remain reproducible and debuggable

## 3. Base Recipes and Variants Are Separate

Decision:
- keep immutable base recipes separate from derived variants

Why:
- preserves the original recipe
- supports caching
- supports auditability of transformations

## 4. Aggregation Must Be Deterministic

Decision:
- ingredient aggregation is pure system logic

Why:
- quantity math must be correct
- behavior must be testable

## 5. Culinary and Retail Domains Stay Separate

Decision:
- keep recipe ingredients and purchasable products in different models

Why:
- culinary data and retail data evolve differently
- matching is an explicit mapping problem

## 6. Product Matching Is Score-Based

Decision:
- use deterministic scoring rather than AI to select products

Why:
- price selection needs consistency
- scoring logic is easier to inspect and tune

Typical signals:
- name similarity
- size compatibility
- price efficiency

## 7. Canonical Ingredient Naming Is Required

Decision:
- normalize ingredients to canonical identifiers before aggregation and matching

Why:
- prevents duplicate identities for the same ingredient
- improves matching accuracy

Example:

```text
"chicken breast" -> canonical key
"boneless chicken breast" -> display label
```

## 8. Monorepo With Shared Contracts

Decision:
- keep web, api, and shared types in one pnpm workspace

Why:
- reduces schema drift
- speeds up iteration

## 9. NestJS for the Backend

Decision:
- use NestJS modular architecture

Why:
- clear separation of concerns
- better long-term maintainability than an ad hoc server

## 10. PostgreSQL for Persistence

Decision:
- use a relational database

Why:
- the system has strong entity relationships
- structured querying matters

## 11. Redis for Async and Caching

Decision:
- use Redis later for caching and background jobs

Why:
- LLM calls and matching workflows can become expensive

## 12. Docker for Local Infra

Decision:
- run local infrastructure through Docker

Why:
- consistent onboarding
- reproducible local environments

## 13. Build the Pipeline Before the UI

Decision:
- prioritize backend workflow and data contracts before frontend complexity

Why:
- the product's core value is the cart-generation pipeline

## 14. Mock Retailer First

Decision:
- start with a mock product catalog before real retailer integrations

Why:
- avoids early third-party API complexity
- lets matching logic be developed in isolation

## 15. Avoid Premature Complexity

Decision:
- delay microservices, multi-retailer support, and advanced optimization

Why:
- the MVP still needs a working vertical slice
