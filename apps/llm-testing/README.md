# Chef LLM Testing Lab

This Streamlit app is a local test harness for Chef's recipe AI layer.

It exercises:

- meal idea to structured recipe previews
- weekly or multi-meal generation with dietary, inventory, budget, and quality context
- ingredient substitution proposals with downside/benefit explanation
- confirm-then-apply recipe swaps
- deterministic ingredient aggregation into a cart preview

## Run

```bash
cd apps/llm-testing
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

By default the lab runs with `CHEF_LLM_PROVIDER=mock`, so it works without API keys.

## Provider Env

```bash
CHEF_LLM_PROVIDER=mock

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
```

OpenAI is the recommended first real provider for this prototype because the Chef workflow depends on schema-shaped recipe data. Anthropic is included as a secondary adapter so the provider can remain swappable.
