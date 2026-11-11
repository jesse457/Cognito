<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Semantic search embeddings
    |--------------------------------------------------------------------------
    |
    | Leave the provider blank to use the Laravel AI SDK's default provider for
    | embeddings. When that provider has no key configured, the app falls back
    | to a deterministic local vector, so search still works offline and in
    | tests. The vector column matches `dimensions`; an AI provider that cannot
    | return that size is treated the same way as an unavailable one.
    |
    */

    'provider' => env('EMBEDDINGS_PROVIDER'),

    'model' => env('EMBEDDINGS_MODEL'),

    'key' => env('EMBEDDINGS_KEY'),

    // A direct URL wins over the Laravel AI provider configuration. Use "auto"
    // to resolve the Windows host from WSL for a local llama-server, or an
    // explicit value such as http://192.168.1.20:8081/v1.
    'url' => env('EMBEDDINGS_URL'),

    'port' => (int) env('EMBEDDINGS_PORT', 8081),

    // EmbeddingGemma expects asymmetric prompts. Empty values use the model's
    // recommended search/document templates when the model name contains
    // "embeddinggemma"; other providers keep their raw text.
    'query_prefix' => env('EMBEDDINGS_QUERY_PREFIX'),

    'document_prefix' => env('EMBEDDINGS_DOCUMENT_PREFIX'),

    // EmbeddingGemma is 768-dimensional. OpenAI's text-embedding-3-small uses
    // 1536; the vector column must match this value, so re-run the resize
    // migration and `questions:embed --fresh` after changing it.
    'dimensions' => (int) env('EMBEDDINGS_DIMENSIONS', 768),

    // Cosine distance cutoff (1 - similarity). Hits farther away than this are
    // treated as misses and fall back to keyword search, which avoids showing
    // arbitrary neighbours for an unrelated query.
    'max_distance' => (float) env('EMBEDDINGS_MAX_DISTANCE', 0.82),

];
