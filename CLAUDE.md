## graphify

This project uses a graphify knowledge graph to save tokens: query the graph instead of grepping and reading whole files.

Setup (once per machine): `pip install graphifyy`. If `graphify` isn't on PATH, call it through the Python that has it installed.

One shared graph — don't build one per worktree:
- The shared graph of `saas` lives at `D:/Work/Webfudge Systems/webfudge-graph-saas/graphify-out/graph.json` (a detached checkout of `origin/saas`, no node_modules). Pass it to every command with `--graph "<that path>"`. Its file paths are repo-relative, so they match any worktree.
- Don't run `graphify update .` inside session or ticket worktrees.
- The orchestrating session refreshes the shared graph when `saas` moves: `git -C "<shared checkout>" checkout --detach origin/saas` after a fetch, then `graphify update .` in that folder. Code you just wrote isn't in it; read your own new files directly.
- The main checkout keeps its own graph (`graphify-out/`, git-ignored), refreshed by the git hooks.

Rules:
- Run `graphify query "<question>" --graph <shared graph>` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt and every session brief that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened.
- Keep query output small: start with `--budget 800` and raise it only if the answer was cut.
- Read GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
