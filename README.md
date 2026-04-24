# Octogen

## Notes: Groq TPM rate limit during commit summarization

### Problem

When creating a project / pulling commits, summarization could fail with Groq tokens-per-minute (TPM) rate limiting.

This happened because:

- Large diffs were being summarized.
- Summaries were being generated concurrently across multiple commits (and in the worst case, concurrently across diff chunks).

### Solution implemented

The commit summarization pipeline was updated to reduce concurrency and reduce the amount of text sent to the model:

- In `src/lib/github.ts`:
  - Diffs are fetched from the GitHub API with `Accept: application/vnd.github.v3.diff`.
  - Commit summarization is done sequentially (loop + `await`) rather than `Promise.all`, which prevents bursts that exceed TPM.

- In `src/lib/ai-providers.ts`:
  - The diff is filtered down to meaningful lines via `extractMeaningfulDiff`.
  - The diff is aggressively trimmed down to stay within a safe token budget before sending to the model.
  - Chunking is treated as a last resort; when used, chunk requests are processed sequentially and then merged.

### Drawbacks
- It takes too long to process the commits, 
  - probable fix include caching the summaries, striping the diff in an optimized way to reduce time, and using parallel processing where possible   