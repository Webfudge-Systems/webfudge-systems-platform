## graphify

This project uses a graphify knowledge graph (`graphify-out/`, git-ignored) to save tokens: query the graph instead of grepping and reading whole files.

Setup (once per machine): `pip install graphifyy`. If `graphify` isn't on PATH, call it through the Python that has it installed.

Every checkout and worktree needs its own graph:
- If `graphify-out/graph.json` doesn't exist in your working directory, run `graphify update .` before anything else. It is AST-only, costs no tokens and takes about 2 minutes on this repo.
- The git hooks (`graphify hook install`) keep the main checkout's graph current. They skip linked worktrees, so in a worktree run `graphify update .` yourself after changing code.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt and every session brief that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Keep query output small: start with `--budget 800` and raise it only if the answer was cut.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
