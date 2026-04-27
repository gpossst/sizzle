# Sizzle

![Sizzle](web/public/sizzle.png)

Sizzle is a recipe generation app built by [Alder](https://alder.so) to demonstrate the [Alder Parse API](https://alder.so/documentation/api/parse). Enter a food preference and Sizzle retrieves complete, structured recipes from real sources on the web — including ingredients with amounts, step-by-step instructions, timing, and estimated macros.

## How It Works

1. **User submits a preference** — a dish, cuisine, or ingredient (e.g. "spicy Thai noodles").
2. **The server validates the request** — checks the user's session and token balance before making any external calls (`web/src/routes/api/recipes/generate.ts`).
3. **The Alder Parse API is called** — `web/src/lib/alder.ts` sends a POST request to the Alder Parse endpoint with a search query, an extraction prompt, and a JSON Schema describing the expected response shape.
4. **Recipes are returned as structured data** — Alder finds relevant web sources, reads them, and returns the recipes as validated JSON matching the schema.
5. **Macros are estimated** — ingredient amounts are converted to grams and matched against the USDA FDC nutrition database to produce per-ingredient and per-serving macro summaries.
6. **Recipes are saved to Convex** — the generated recipes are persisted to the user's account and tokens are deducted.

## Alder API Integration

The core integration lives in [`web/src/lib/alder.ts`](web/src/lib/alder.ts). Each call to `generateRecipesFromPreference` sends a single POST to the Alder Parse endpoint:

```ts
{
  query:  "spicy thai noodles recipe",   // keyword search used to find sources
  prompt: "Extract exactly N complete recipes from the sources...",  // extraction instructions
  schema: RECIPE_EXTRACTION_SCHEMA,      // JSON Schema for the response shape
  limit:  N,                             // number of sources to search
}
```

**`query`** is a web-search-style keyword string. Sizzle ensures it always ends with the word `recipe` so Alder retrieves cooking-focused sources.

**`prompt`** tells Alder exactly how to extract data from those sources: how many recipes to return, how to handle ingredient groups and amounts, and what formatting rules to follow (e.g. no vague quantities like "some" or "a bit").

**`schema`** is a JSON Schema (`web/src/lib/recipe-schema.ts`) that constrains the response to a typed structure with required fields: `title`, `ingredientGroups`, and `steps`. Alder uses this to return data that matches the shape your app expects. Some model providers behind Alder reject certain JSON Schema keywords like `additionalProperties`, so Sizzle strips those before sending.

**`limit`** sets the number of sources to retrieve, matched to the number of recipes requested.

The response includes:

- `data` — the parsed recipes as structured JSON matching the schema
- `sources` — attribution references for the source pages Alder read
- `charge` — the API usage charge for the request

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| Database | [Convex](https://convex.dev) |
| Auth | [Better Auth](https://www.better-auth.com) |
| Payments | [Stripe](https://stripe.com) |
| Styling | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Runtime | [Bun](https://bun.sh) |

## Getting Started

```bash
cd web
bun install
bun run dev
```

Required environment variables (see `web/.env.example`):

| Variable | Description |
|---|---|
| `ALDER_API_URL` | Alder Parse endpoint (e.g. `https://api.alder.so/v1/parse`) |
| `ALDER_API_KEY` | Your Alder API key |
| `VITE_CONVEX_URL` | Your Convex deployment URL |
| `BETTER_AUTH_SECRET` | Secret for Better Auth session signing |
| `FDC_API_KEY` | USDA FDC API key for macro estimation (optional) |
