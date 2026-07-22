# Perception

Local coding agent harness powered by an OpenAI-compatible endpoint (vLLM on `localhost:8000` by default).

## Run

```bash
pnpm install
pnpm start
```

From another directory:

```bash
/path/to/perception/bin/perception.js
```

## Scripts

| Command | Description |
|---|---|
| `pnpm start` / `pnpm dev` | Interactive REPL |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit tests |
