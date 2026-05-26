# Chef / Butter Me Business Costs And Campus Marketing Plan

Last updated: May 25, 2026

This document is an internal cost and launch-readiness plan with an investor-facing summary at the top. It should be updated with real invoices, vendor quotes, and ad platform results before it is used for fundraising or budget approval.

## Investor-Facing Summary

Chef / Butter Me is an AI meal execution app focused on three core jobs:

1. Recipe selection and recipe addition.
2. Cooking with agent-guided and voice-guided help.
3. One-tap shopping for ingredients the user does not already have.

The strongest student-facing wedge is not "another recipe app." It is:

```text
Choose what you want to cook -> remove what you already have -> shop for what is missing -> cook hands-free.
```

The initial business model should be freemium with a paid monthly plan. Free users should get enough value to understand the workflow, but AI-heavy and commerce-heavy moments should be metered or premium-gated because those are the moments that create real API and infrastructure cost.

Recommended first launch motion:

- Anchor campus: Knox College.
- Expansion: comparable campuses only after the Knox pilot proves acquisition cost, activation, and willingness to pay.
- First paid use case: AI shopping cart generation and hands-free cooking.
- Main readiness blocker before paid ads: attribution and premium gating must be implemented before spending broadly.

## Current Product And Cost Evidence

Repo evidence currently shows these product surfaces and paid-service dependencies:

- Core app areas: dashboard/home, recipes, carts, shopping, inventory, onboarding, account settings, AI workspace, and mobile app foundation.
- AI and voice services: OpenAI, Anthropic, and ElevenLabs are represented in `.env.example`.
- Deployment services: Railway API/backend path and Vercel web path are documented in `docs/FEATURES.md` and `docs/branching.md`.
- Data layer: Supabase/Postgres is represented in `.env.example` and documented in `docs/supabase-database.md`.
- Commerce providers: Kroger product search and Instacart handoff are represented in `.env.example`, `docs/FEATURES.md`, and `docs/decisions.md`.
- Current limitation: checkout profile data is saved as address/payment-card-like profile state, but it is not real payment processing or tokenized billing infrastructure.

## Internal Operating Budget

### Confirmed Or Evident Monthly Costs

| Cost item                   | Current status                                                 |                               Budget amount | Source / confidence                                                                                                                                                                                                                                                                                          | Notes                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway backend hosting     | In use or planned for backend deployment                       |                               $5/mo minimum | Confirmed public price: Railway Hobby is $5/mo and includes $5 usage credit ([Railway pricing](https://docs.railway.com/pricing/plans))                                                                                                                                                                      | Usage above included credit increases the bill.                                                                                                 |
| Vercel web hosting          | Basic/free currently assumed                                   |             $0/mo now; $20/mo if Pro needed | Public price: Vercel Hobby is free, Pro is $20/mo plus usage ([Vercel pricing](https://vercel.com/pricing))                                                                                                                                                                                                  | Hobby is for personal/non-commercial use; a commercial launch likely needs Pro.                                                                 |
| Codex / Claude team tooling | Stated by team                                                 |       $100/mo minimum; safer budget $200/mo | Team input                                                                                                                                                                                                                                                                                                   | $20 x 5 people = $100/mo if each person has one paid AI coding subscription. If each person needs both OpenAI/Codex and Claude, budget $200/mo. |
| OpenAI API                  | Evident in `.env.example`; used by AI features when configured |                                    Variable | Public price: GPT-5.4 mini is $0.75 input / $0.075 cached input / $4.50 output per 1M tokens ([OpenAI GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [OpenAI API pricing](https://openai.com/api/pricing/))                                                                      | Must be tracked per feature: recipe generation, import, chat, inventory fill, shopping cart AI, and hands-free assistance.                      |
| Anthropic API               | Evident in `.env.example`; secondary AI provider boundary      |     Variable / not currently assumed active | Needs account invoice or official pricing check before use                                                                                                                                                                                                                                                   | Do not budget this as active spend unless the deployed environment has an Anthropic key and traffic.                                            |
| ElevenLabs API              | Evident in `.env.example`; used for web voice features         | $0 to $99+/mo depending on plan and credits | Public price: Free, Starter $6/mo, Creator $11/mo, Pro $99/mo, Scale $299/mo, Business $990/mo; API uses account credits ([ElevenLabs pricing](https://elevenlabs.io/pricing), [ElevenLabs API cost note](https://help.elevenlabs.io/hc/en-us/articles/28184926326033-How-much-does-it-cost-to-use-the-API)) | Hands-free voice should be premium or tightly limited because usage can scale with cooking time.                                                |
| Supabase/Postgres           | Evident in `.env.example`                                      |     $0/mo now if free; $25/mo if Pro needed | Public pricing page/search result indicates Pro at $25/mo ([Supabase pricing](https://supabase.com/pricing))                                                                                                                                                                                                 | Upgrade likely needed for backups, reliability, and shared production use. Verify actual org/project invoice.                                   |
| Google auth                 | Evident in `.env.example`                                      |                              $0/mo expected | Repo evidence only                                                                                                                                                                                                                                                                                           | Cost is usually not the issue; privacy disclosures and OAuth configuration are.                                                                 |
| Kroger provider             | Evident in `.env.example`                                      |                     Unknown / partner terms | Needs developer agreement review                                                                                                                                                                                                                                                                             | Treat as credential-gated and potentially rate-limited. Do not promise native checkout.                                                         |
| Instacart handoff           | Evident in `.env.example`                                      |                     Unknown / partner terms | Needs developer agreement review                                                                                                                                                                                                                                                                             | Handoff is valuable for launch, but partner limits and approval must be checked.                                                                |
| Unsplash image enrichment   | Evident in `.env.example`                                      |            Unknown / likely free tier first | Needs account review                                                                                                                                                                                                                                                                                         | Confirm whether usage fits free/API limits before ads drive traffic.                                                                            |

### Near-Term Costs To Add Before Campus Ads

| Cost item                  |                                                                        Budget amount | Source / confidence                                                                                                     | Why it matters                                                                                  |
| -------------------------- | -----------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Domain                     |                                                                 $10-30/year estimate | Estimate                                                                                                                | Needed for trust, landing pages, email, and ad approvals.                                       |
| Business email             |                                                               $6-12/user/mo estimate | Estimate                                                                                                                | Needed for support, vendor outreach, campus partnerships, and ad accounts.                      |
| Analytics / attribution    |                                                                   $0-100/mo estimate | Estimate                                                                                                                | Needed before paid ads. GA4/Firebase may start free; paid product analytics may be added later. |
| Stripe or billing provider | 2.9% + 30c per successful domestic card transaction if using Stripe standard pricing | Public price ([Stripe pricing](https://stripe.com/pricing))                                                             | Needed for web subscriptions unless app-store billing is used.                                  |
| Apple Developer Program    |                                                                             $99/year | Public price ([Apple Developer Program](https://developer.apple.com/programs/))                                         | Needed for iOS App Store distribution.                                                          |
| Google Play Console        |                                                                         $25 one-time | Public help result ([Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435)) | Needed for Android Play Store distribution.                                                     |
| Legal document preparation |                                                  $500-5,000 estimate or quote needed | Estimate / quote needed                                                                                                 | Required before charging students and running paid acquisition.                                 |
| Campus creative production |                                                  $750-5,000 estimate or quote needed | Quote needed                                                                                                            | Includes filming, editing, voiceover/captions, vertical cuts, and usage rights.                 |
| Paid social management     |                                                                         Quote needed | Clear Profits or other vendor quote needed                                                                              | Do not assume pricing; ask for monthly retainer and setup fee separately.                       |
| Pilot ad spend             |                                                         $500-1,500/mo planning range | Internal estimate                                                                                                       | Enough to test messages without pretending broad campus scale is proven.                        |
| Campus launch materials    |                                                                    $100-750 estimate | Estimate                                                                                                                | QR flyers, table cards, stickers, referral cards, ambassador handouts.                          |

### Cost Controls Required Before Growth

- Keep AI usage categories visible in account settings and aligned with `docs/llm-mechanism.md`.
- Move from process-local AI rate limits to a shared store before multi-instance production.
- Add server-side premium entitlements before any frontend paywall is marketed.
- Put hard monthly spend limits on OpenAI, ElevenLabs, Vercel, Railway, and ad accounts.
- Track unit economics by action: recipe create/import, cart generation, hands-free session, checkout start, and subscription purchase.

## Premium Model

Recommended model: freemium plus monthly subscription.

### Free Tier

Free users should be allowed to experience the product, but not unlimited AI:

- Browse public recipes.
- Save or create up to 2 personal recipes.
- Use limited recipe generation/import.
- Use limited inventory fill.
- Generate a small number of cart/shopping flows, or preview missing ingredients without full premium matching.
- See account AI usage and upgrade prompts.

### Premium Tier

Premium should unlock or expand:

- AI shopping cart generation.
- Higher recipe creation/import limits.
- Hands-free cooking.
- Agent-guided voice cooking.
- More AI chat and cooking help.
- More saved carts/history.
- Advanced inventory-aware planning.

### App Work Required Before Charging

Do not run serious paid ads into a product that cannot clearly convert and enforce premium access. Required work:

- Billing provider: Stripe for web subscriptions, app-store billing for native app distribution, or both with clear entitlement rules.
- User entitlement model: free, premium, trial, cancelled, grace period, and admin/test states.
- Server-side gates: shopping cart AI, hands-free cooking, recipe create/import limits, and any OpenAI-backed route that should be premium.
- Usage counters: recipe count, AI requests, cart generations, hands-free sessions, and premium feature attempts.
- Paywall UI: clear upgrade moments where the user understands what value is locked.
- Account billing page: current plan, renewal/cancel instructions, receipts or billing portal link.
- Cancellation and refund flow: do not improvise this after users pay.
- Analytics events: track paywall views, checkout starts, successful subscription, cancellations, and premium feature usage.

## Campus Marketing Plan

### Launch Discipline

Knox College should be the anchor campus because it gives the team a realistic place to observe students, gather feedback, film authentic content, and understand whether the product solves a real cooking problem.

Do not launch "other colleges broadly" with major spend until the Knox pilot proves:

- Cost per signup.
- Onboarding completion rate.
- First recipe selected or created.
- First cart generated.
- Shopping list created.
- First hands-free cooking session.
- Free-to-premium conversion.
- Day 7 retention.

### Pilot Structure

Phase 1: Knox College pilot

- Goal: prove message, activation, and first paid conversion.
- Audience: students living on campus or near campus with access to a dorm kitchen, apartment kitchen, shared kitchen, or grocery delivery/pickup.
- Core message: "Turn what you want to cook into a shopping cart for what you do not already have."
- Best creative angles:
  - "I made dinner from my dorm/apartment kitchen."
  - "I picked a recipe, Butter Me removed what I already had, then built the cart."
  - "Say 'Chef' while cooking and keep your hands free."
- "Stop buying random groceries. Cook the thing you actually picked."

Campus targeting should not depend only on ad-platform interest targeting. Use a mix of:

- Knox-specific landing page and QR codes.
- Campus ambassador/referral codes.
- Geo-targeted ads around campus and nearby student housing.
- Student organization partnerships.
- Creator-style videos filmed in realistic student kitchens.
- Flyers/table cards in allowed campus locations.
- Paid social retargeting only after the privacy policy, cookie/tracking notice, and consent language are ready.

Phase 2: nearby or similar campuses

- Expand only after Knox has a working conversion funnel.
- Prioritize campuses with high off-campus/apartment living, accessible grocery options, and student groups that care about budget, fitness, international food, or cooking.

Phase 3: broader college campaigns

- Use campaign learnings to build repeatable creative templates.
- Use campus referral codes to separate organic sharing from paid ads.

## Clear Profits / Marketing Vendor Notes

Clear Profits Digital Marketing is based in Monmouth, IL and publicly lists services including website development, social media marketing, Google Ads management, content creation, social media ads, and videography. Their site also positions the company as a Google Partner and describes social media, Google Ads, and videography as services ([Clear Profits](https://clearprofitsdm.com/)).

Important: no public package pricing was found. Treat all Clear Profits costs as quote needed.

### Quote Request Checklist

Ask Clear Profits or any competing vendor for a written quote that separates:

- One-time creative strategy and campaign setup.
- On-campus video shoot.
- Number of raw filming hours.
- Number of edited vertical videos.
- Number of hooks/variants per video.
- Captions, subtitles, thumbnails, and export formats.
- Rights to raw footage and edited footage.
- Student model release management.
- Monthly social posting calendar.
- Monthly paid ads management.
- Google Ads, Meta, TikTok, and YouTube Shorts setup.
- Reporting cadence and sample report.
- Minimum recommended ad spend.
- Whether ad spend is paid directly by us or passed through the vendor.
- Cancellation terms and ownership of accounts.

### Vendor Fit Questions

Ask these before signing:

- Have you run campaigns targeting college students or local campuses?
- Can we own all ad accounts, pixels, analytics, and creative assets?
- Can you shoot real student cooking content rather than generic food content?
- Can you create content for TikTok, Instagram Reels, YouTube Shorts, and campus QR pages?
- Can you report cost per signup, onboarding completion, cart generation, and premium conversion?
- Can you operate with a small pilot budget before scaling?

## Ads Readiness

### Product And Website Setup

Before running ads, prepare:

- Campus landing page: `/campus/knox` or equivalent.
- UTM structure: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `campus`.
- Campus/referral codes: `KNOX`, ambassador codes, and QR-specific codes.
- Clear app store or web-app path: ads should not send users into a confusing unfinished flow.
- Screenshots and 10-20 second video demos showing the exact core loop.
- Support email and privacy/terms links on every campaign landing page.

### Required Conversion Events

Track these before paid spend:

| Event                      | Why it matters                               |
| -------------------------- | -------------------------------------------- |
| `signup_started`           | Measures landing page intent.                |
| `signup_completed`         | Core acquisition event.                      |
| `onboarding_completed`     | Measures whether students reach the product. |
| `recipe_created`           | Measures recipe addition value.              |
| `recipe_selected`          | Measures recipe selection value.             |
| `inventory_voice_started`  | Measures inventory setup intent.             |
| `inventory_voice_saved`    | Measures successful voice inventory setup.   |
| `cart_generated`           | Measures core premium shopping value.        |
| `shopping_list_created`    | Measures move from planning to purchase.     |
| `checkout_started`         | Measures commerce intent.                    |
| `hands_free_started`       | Measures cooking feature value.              |
| `paywall_viewed`           | Measures premium pressure points.            |
| `premium_checkout_started` | Measures willingness to pay.                 |
| `subscription_purchased`   | Measures revenue conversion.                 |

### Platform Readiness

- Google Ads: Google says mobile app conversion tracking can measure installs and in-app actions; Firebase, GA4, third-party analytics, and Google Play are supported paths ([Google Ads conversion tracking](https://support.google.com/google-ads/answer/16056245)).
- TikTok: TikTok App Events SDK supports app events such as installs, add to cart, and purchases, and can be used for audiences and campaign optimization ([TikTok App Events SDK](https://ads.tiktok.com/help/article/about-the-tiktok-app-events-sdk)).
- Meta: prepare for Meta app campaigns and app events, but expect business account/login setup and SDK/pixel configuration before usable attribution ([Meta app campaigns](https://www.facebook.com/business/ads/meta-advantage-plus/app-campaigns), [Meta app events docs](https://developers.facebook.com/docs/app-events/)).
- Web campaigns: if the first launch is web-first, use GA4 or another analytics stack with UTMs before app SDK work.

### Creative Rules

- Show real app flow, not vague AI magic.
- Do not imply grocery checkout is fully native unless the provider flow actually supports it.
- Do not imply nutrition or dietary accuracy is medical advice.
- Do not show a student in ads without a signed release.
- Do not make claims like "saves $X per week" until measured.

## Legal And Policy Documents Needed

Prepare these before paid acquisition and before charging:

| Document                               | Why needed                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Terms of Service                       | User rules, account terms, limitations, disputes, and acceptable use.                                   |
| Privacy Policy                         | Required for accounts, analytics, ads, AI processing, and app stores.                                   |
| Cookie / Tracking Notice               | Needed for web analytics, ad pixels, retargeting, and consent.                                          |
| Subscription Terms                     | Pricing, renewal, cancellation, trials, student discounts, and plan limits.                             |
| Refund / Cancellation Policy           | Prevents confusion and payment disputes.                                                                |
| AI Disclaimer                          | Explains AI outputs are drafts/suggestions and may be wrong.                                            |
| Food Safety / Nutrition Disclaimer     | Cooking and nutrition guidance cannot be treated as medical, allergy, or safety advice.                 |
| Acceptable Use Policy                  | Prevents abuse of AI, imports, accounts, and public/content features.                                   |
| Copyright / Recipe Import Policy       | Needed for pasted recipes, creator links, screenshots, and attribution.                                 |
| Campus Filming Consent / Model Release | Required before using student footage in ads.                                                           |
| Vendor Agreement                       | Covers ownership of ad accounts, raw footage, deliverables, confidentiality, payment, and cancellation. |
| Ad Claims Review Checklist             | Keeps claims truthful and avoids unsupported savings, health, or delivery promises.                     |

Warning: the app currently has saved checkout profile data, but repo docs explicitly frame it as checkout-oriented profile state, not real payment-token infrastructure. Do not describe it as production payment processing until a real payment provider and security model are implemented.

## What Is Missing

These are the highest-priority missing pieces before serious campus ads:

- Real subscription billing and server-side premium entitlements.
- A clear free-vs-premium limit policy implemented in backend code.
- Ad attribution events and campus referral codes.
- Privacy/terms/subscription/legal documents.
- A live support email and support workflow.
- A campus landing page with Knox-specific copy.
- Written vendor quotes for video production and social management.
- A monthly spend cap for OpenAI, ElevenLabs, Railway, Vercel, and ad platforms.
- A decision on whether the first paid launch is web-only, app-store-first, or both.

## Source Links

- Clear Profits: https://clearprofitsdm.com/
- Railway pricing: https://docs.railway.com/pricing/plans
- Vercel pricing: https://vercel.com/pricing
- Supabase pricing: https://supabase.com/pricing
- ElevenLabs pricing: https://elevenlabs.io/pricing
- ElevenLabs API cost note: https://help.elevenlabs.io/hc/en-us/articles/28184926326033-How-much-does-it-cost-to-use-the-API
- OpenAI GPT-5.4 mini model pricing: https://developers.openai.com/api/docs/models/gpt-5.4-mini
- OpenAI API pricing: https://openai.com/api/pricing/
- Google Ads app conversion tracking: https://support.google.com/google-ads/answer/16056245
- Meta app campaigns: https://www.facebook.com/business/ads/meta-advantage-plus/app-campaigns
- Meta app events: https://developers.facebook.com/docs/app-events/
- TikTok App Events SDK: https://ads.tiktok.com/help/article/about-the-tiktok-app-events-sdk
- Stripe pricing: https://stripe.com/pricing
- Apple Developer Program: https://developer.apple.com/programs/
- Google Play Console setup: https://support.google.com/googleplay/android-developer/answer/6112435
