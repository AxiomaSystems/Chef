# Business - Cussien

This document frames Cussien as a startup: the problem, customer, wedge, sales motion, and marketing strategy.

## One-Liner

Cussien turns food ideas into meals you can actually cook.

## Expanded One-Liner

Cussien is an AI-powered meal execution platform that turns recipes, cravings, creator content, and dietary goals into structured meals, missing ingredients, real grocery carts, nutrition tracking, and eventually live cooking guidance.

## Problem

People do not need another place to browse recipes.

They need help executing cooking.

The current cooking workflow is fragmented:

- recipes live in TikTok, Instagram, blogs, YouTube, notes, menus, and screenshots
- dietary goals live in calorie/macro trackers
- grocery shopping lives in retailer apps
- meal planning lives in notes or memory
- substitutions happen through Google or generic chatbots
- cooking help happens mid-recipe when the user is already stuck

The result:

- people eat the same easy meals repeatedly
- people order food instead of cooking
- people buy groceries without a plan
- people waste ingredients
- people give up when a recipe does not fit their constraints

The core problem:

```text
People want to cook, but the operational work between food intent and cooked meal is too high.
```

## Target Customer

### Initial ICP

Busy young adults who want to cook more often but hate planning groceries.

Examples:

- students living independently
- recent graduates
- young professionals
- couples
- people who save recipes but never make them
- people who care about health, budget, or macros but dislike meal planning

Behavioral traits:

- already use grocery apps
- already save recipes online
- already ask AI or Google cooking questions
- already feel planning friction
- willing to try a tool that saves time

### Secondary Segments

Later targets:

- fitness and macro-conscious users
- families planning weekly dinners
- food creators and influencers
- nutrition coaches
- meal-prep coaches
- culturally diverse home cooks looking for substitutions in US retailers
- people with dietary restrictions

## Wedge

The wedge is not "AI recipes."

The wedge is:

```text
Generate or import a meal -> edit it to your constraints -> remove what you already have -> generate a real grocery cart.
```

This is concrete, demoable, and different from most recipe apps.

## MVP Promise

"Tell Cussien what you want to cook. It gives you a recipe, lets you adjust ingredients, and builds the grocery cart."

MVP flow:

1. User enters a food idea or recipe.
2. Cussien generates or structures the recipe.
3. User reviews ingredients.
4. User removes what they already have.
5. Cussien generates a Kroger shopping cart.
6. User edits products/quantities and saves the cart.

## Product Pillars

### 1. Recipe Intelligence

- generate recipes with LLMs
- import/fork recipes from outside sources
- edit recipes based on constraints
- create structured ingredients and steps
- support recipe variants

### 2. Grocery Execution

- aggregate ingredients
- identify missing ingredients
- match ingredients to real retailer products
- generate editable shopping carts
- support cart export/share later

### 3. Nutrition And Tracking

- calculate calories and macros per recipe
- calculate per serving and per meal
- eventually track across day/week
- adapt recipes to macro/calorie goals

### 4. Kitchen Context

- know user preferences
- later know pantry/fridge state
- infer inventory from purchases and cooking
- support manual pantry staples first
- use camera/object detection later

### 5. Cooking Assistance

- contextual chat per recipe
- live cooking guidance
- substitutions
- troubleshooting
- timing help
- voice/character experience later

## Business Model

### Initial Model

Freemium consumer subscription.

Free tier:

- limited recipe generation/import
- limited cart generation
- basic grocery cart editing

Paid tier:

- more generations
- real retailer integrations
- nutrition/macros
- recipe editing
- saved preferences/history
- advanced cart features
- future cooking assistant

Possible pricing hypothesis:

- consumer: `$8-15/month`
- pro/creator/coach tier later

### Future Revenue Lines

- affiliate revenue from grocery retailers
- creator tools
- nutrition coach/client workspace
- cart export partnerships
- premium AI cooking assistant
- family/shared planning plans

## Go-To-Market

### Demo-Led Content

Cussien should be marketed through visual demos.

Examples:

- "I turned Pakistani biryani into a Kroger cart."
- "I generated a high-protein dinner and removed what I already had."
- "I imported a TikTok recipe and got the grocery cart."
- "I asked for dinner under 700 calories and got the cart."

### Creator Partnerships

Food creators can be a distribution channel.

Possible offer:

- cart-ready recipe links
- public recipe/carts
- creator profiles
- influencer badges
- free pro access

### SEO

Target high-intent searches:

- recipe to grocery list
- AI meal planner
- meal planner with grocery cart
- grocery list from recipe
- macro meal planner
- Kroger meal planning app
- Instacart recipe cart

### Community

Potential communities:

- meal prep
- Eat Cheap And Healthy
- fitness/macros
- cooking
- student cooking
- budget food
- cultural food communities

## What Not To Sell First

Do not sell Cussien as:

- another recipe database
- a generic AI chatbot
- a calorie tracker clone
- a grocery delivery app
- a social network

Sell it as:

```text
the fastest way to turn what you want to eat into what you need to buy and cook
```

## Strategic Risks

- real retailer APIs can be hard or bureaucratic
- grocery matching can be noisy
- exact inventory tracking can become too demanding for users
- generic AI recipe generation is crowded
- frontend polish can distract from the core engine

## Strategic Advantages

- the recipe -> cart -> shopping cart model is already implemented
- Kroger is already working as a live retailer path
- the provider boundary makes future retailers easier
- structured recipe data makes AI output useful
- editable shopping carts reduce the need for perfect automation
- the product can expand naturally into nutrition, inventory, and cooking assistance

## Current Startup Bet

Cussien wins if users believe:

```text
I can tell it what I want to eat, and it will help me actually cook it.
```

That means the first product must be practical before it is magical.

The magic comes later through agents, inventory, nutrition, community, and live cooking assistance.
