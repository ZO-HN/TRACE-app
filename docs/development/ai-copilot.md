# Current mobile AI setup

Status: implemented provider integration; live inference/device tests unverified. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: mobile `src/lib/ai/`, current settings route and diagnosis D19. Shared AI service is a [proposal](../../../TRACE/docs/planning/architecture-evolution.md).

Open `/ai-copilot/settings`, select a supported provider, configure the endpoint/API key and a model available to that account, then use Test connection and Save. A connection test sends a potentially billable request; it is not a local configuration check. Never place keys in source, public environment variables, documentation or chat logs.

Google uses its compatible endpoint; Anthropic uses native Messages formatting; compatible endpoints use their supported request contract. Only send a key to an endpoint trusted to receive it. Model availability and billing depend on the configured API account; preset names/mock tests are not live entitlement evidence.

Native config currently uses one device-global SecureStore key, without account scoping. Web config is memory-only and disappears on reload. Account-switch/revoke behavior needs correction/verification before claiming per-account isolation. The configured provider receives submitted chat/images/audio. This mode does not send keys/chat through TRACE's backend, automatically attach workout history, or perform tool-based data changes. Chat history is session-local.

Gemini/Anthropic transcription is unsupported by the current integration; compatible-provider transcription needs real native file/permission/timeout checks. Custom browser endpoints may reject CORS. Photo estimates need finite/non-negative validation and user review before logging. Follow [AI requirements](../../../TRACE/docs/features/ai.md); changing to TRACE-funded shared inference needs a separate product decision.

Provider contract references: [Google compatibility](https://ai.google.dev/gemini-api/docs/openai), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create), [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). These links are setup references, not claims that every model was tested.
