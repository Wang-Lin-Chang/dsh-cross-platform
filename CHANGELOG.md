# Changelog

All notable changes to dsh-cross-platform are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-16

### Added

- `detach-runner-linux.cjs` — task runner with protocol parity to the Windows runner (`EXIT:<code>`, `lock = pid:startSec`, O_EXCL semantics); bwrap read-only view mode for write isolation.
- `linux-backend.mjs` — sandbox backend: chattr +i apply/verify/restore + capability self-description backed by experiment numbers.
- `linux-utils.mjs` — `/proc/<pid>/stat` start-time formula + btime + liveness + exit protocol.
- bubblewrap read-only view with the mount-order recipe `ro-bind / → tmpfs /tmp → ro-bind jobDir` (EXP-3 / EXP-9).
- `vendor/` — self-contained `WitnessJobRegistry` build with darwin-aware branches (runner selection + `ps` start time) and the runner copies for registry integration.
- Witness 12-item acceptance, Linux edition — 34/34 ×3 consecutive stable runs on CI.
- Engineering packaging: README, LICENSE, SECURITY, CONTRIBUTING, THIRD_PARTY_NOTICES, CI workflow.

### Changed

- None (first release).

### Fixed

- chattr +i architecture reorder: +i only on exit.txt/lock (the runner never writes them); out.log relies on the bwrap view (EXP-8).
- Runner exit fd opens with `'w'` truncation — protocol files are rewritten per lifecycle (residual `EXIT:0EXIT:0` fixed).
- CI matrix corrected to the actually-tested Node line (25.x only).
