# Contributing

Every capability claim in this repository carries an experiment number (see `EXPERIMENTS.md`). Contributions must follow the same rule.

## Rules

- **No claims without an experiment.** New sandbox capabilities need a probe + control group before they enter `src/`.
- **Control groups are mandatory** — the source of a "blocked" result must be proven (e.g. `chattr +i` before/after comparison).
- Tests must pass on a real Linux environment (`npm test` requires bubblewrap; WSL2 Ubuntu is the documented environment).
- No machine-specific paths in committed code.

## Development

```sh
npm test   # Witness 12-item acceptance, Linux edition
```

Environment: WSL2 Ubuntu 26.04 + Node 25 + bubblewrap (`apt install bubblewrap attr`).
