# Token Efficiency Rules

- Prefer targeted file reads over broad repo scans.
- Use ripgrep/search before opening large files.
- Do not read generated files, dependency folders, build outputs, binaries, datasets, or lockfiles unless explicitly necessary.
- In Plan mode, produce a concise plan with affected files, risks, and test strategy.
- In Act mode, follow the approved plan without re-explaining everything.
- Keep responses concise.
- When blocked, ask for the smallest missing context instead of scanning the whole repo.