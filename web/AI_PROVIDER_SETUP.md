# AI provider setup

The Python mentor tries free providers in this order. It skips any provider whose server-side credentials are not configured, and it never selects a paid model route.

1. **Google Gemini 3.8 Flash** — first choice for tutoring quality; the current Gemini API pricing page lists a free tier. Its free-tier data may be used to improve Google products.
2. **Groq GPT-OSS 120B** — strong reasoning and code help. Groq currently lists a free plan; its per-model limits can change and the account Limits page is authoritative.
3. **Cloudflare Workers AI, Llama 3.1 8B** — a smaller backup model with a free Workers allocation of 10,000 Neurons per day. Requests stop when that free allocation is exhausted; do not switch to the Workers Paid plan.
4. **OpenRouter Free** — last resort. The free plan currently allows 50 requests per day and its available models can change. The app uses `openrouter/free`, which selects from free models only. OpenRouter may send the request to different underlying model providers, with different data terms.

Free-plan quotas, models, and terms can change. Keep each provider on its free plan and do not add billing details or credits. When an upstream provider fails, the next provider receives the same tutor request. That request includes the learner's question, lesson title and text, editor code, and recent tutor messages. Do not include private or personally identifying information in lesson code or tutor questions.

## Create the provider credentials

- **Google Gemini:** the project already uses `GEMINI_API_KEY`. If needed, create a key in [Google AI Studio](https://aistudio.google.com/app/apikey). Keep the project on the free API tier; do not link a paid billing account for this key.
- **Groq:** create a free account at [Groq Console](https://console.groq.com/), then create a key at [API Keys](https://console.groq.com/keys). Do not upgrade to the Developer plan.
- **Cloudflare:** create a free account at [Cloudflare](https://dash.cloudflare.com/). Open **Workers AI → Use REST API → Create a Workers AI API Token**, then copy the account ID shown on that page. Do not enable the Workers Paid plan. Cloudflare's current free allocation is 10,000 Neurons per day; exceeded daily free usage is rejected.
- **OpenRouter:** create a free account at [OpenRouter](https://openrouter.ai/), then create a key at [Keys](https://openrouter.ai/settings/keys). Do not buy credits. The app explicitly requests the free model router.

## Add keys to Vercel

In the Vercel project, open **Settings → Environment Variables** and add these variables for **Production** (and Preview if you use preview deployments):

| Variable | Value |
| --- | --- |
| `GROQ_API_KEY` | The Groq key |
| `CLOUDFLARE_API_TOKEN` | The Workers AI token |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account ID |
| `OPENROUTER_API_KEY` | The OpenRouter key |

Keep all of these server-side. Do not use `NEXT_PUBLIC_` prefixes, commit the values, or paste keys into chat. After saving them, redeploy the project so the production function receives the new environment. Missing credentials simply disable that provider; Gemini continues to be tried first.

## Official quota and model references

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Groq rate limits](https://console.groq.com/docs/rate-limits) and [supported models](https://console.groq.com/docs/models)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [free daily allocation errors](https://developers.cloudflare.com/workers-ai/platform/errors/)
- [OpenRouter free plan limits](https://openrouter.ai/pricing) and [free model catalog](https://openrouter.ai/collections/free-models)

DeepSeek's official API is not included because its API is pay-per-token; the free DeepSeek chat website is a separate product from the API.
