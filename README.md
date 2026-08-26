# dsh-cross-platform

> **Part of the [DSH plugin suite](https://github.com/Wang-Lin-Chang)** — six Apache-2.0 plugins for DeepSeek Harness.

> Linux backend for [dsh-witness](https://github.com/Wang-Lin-Chang/dsh-witness) and [dsh-anchor](https://github.com/Wang-Lin-Chang/dsh-anchor). Linux sandbox recipes and process-identity utilities — **every capability claim carries an experiment number and a control group**. (macOS edition: [dsh-macos](https://github.com/Wang-Lin-Chang/dsh-macos).)

中文版见 [README.zh-CN.md](./README.zh-CN.md)。

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![ci](https://github.com/Wang-Lin-Chang/dsh-cross-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Wang-Lin-Chang/dsh-cross-platform/actions/workflows/ci.yml)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-4d6bfe)](https://github.com/topics/dsh-plugin)
[![topic: dsh](https://img.shields.io/badge/topic-dsh-4d6bfe)](https://github.com/topics/dsh)

## Why

dsh-witness's Windows sandbox (six-dimension NTFS ACL closure) needs an equivalent on Linux. This package turns Linux sandbox recipes into components with measured backing:

| Capability | Linux recipe | Experiment verdict |
|---|---|---|
| Overwrite-proof | `chattr +i` + bubblewrap read-only view | EXP-1 / EXP-3 (with control group) |
| Delete-proof | `chattr +i` + read-only view | EXP-1 / EXP-3 |
| Forge-proof (lock/exit.txt) | `chattr +i` | EXP-1 / smoke 12/12 |
| Filesystem isolation | **bubblewrap read-only view (EROFS)** — host and task see two views | EXP-3 |
| Process identity (three evidence) | `/proc/<pid>/stat` field 22 + btime | EXP-6 |
| Exit protocol | `EXIT:<code>` (aligned with Windows) | smoke 12/12 |
| Official recipe | Node `--experimental-permission` | EXP-2 |

## Experiments

All experiments live in `EXPERIMENTS.md`: 9 verdicts, each with a control group (false-positive elimination). Core results:

- **Witness 12-scenario acceptance · Linux edition: 34/34 ×3 stable** (`test/witness-final-linux-test.ts`)
- dsh-anchor Linux full suite: 37/37 (P1-P4, zero code changes)
- Linux runner smoke: 12/12 (normal tasks / sandbox attacks / bwrap mode)

## Components

```
src/
├── detach-runner-linux.cjs   # task runner (bash supervision + dual-mode sandbox, protocol fully aligned with Windows)
├── linux-backend.mjs         # sandbox backend (chattr apply/verify/restore + capability self-report)
└── linux-utils.mjs           # /proc start time + process liveness + exit-code protocol
```

## Quick start

```sh
# Install (git source, pinned tag — the pre-npm installation path)
dsh plugin --profile <name> add "github:Wang-Lin-Chang/dsh-cross-platform#v0.1.0"
```

```ts
import { LinuxSandboxBackend } from 'dsh-cross-platform'

const backend = new LinuxSandboxBackend('/path/to/job-dir')
backend.apply()        // chattr +i evidence files (before task spawn)
backend.verify()       // fail-closed self-check (aligned Windows EXIT:-998 semantics)
backend.restore()      // restore after task death (registry terminal-state window)
```

Direct runner usage (same protocol as the Windows detach-runner.cjs):

```sh
node detach-runner-linux.cjs <jobDir> <outFile> <exitFile> <commandBase64> [bwrap]
```

## Honest boundaries

- **Linux measured environment**: WSL2 Ubuntu 26.04 LTS (kernel 6.6) + Node 25.8.1. Other distros/kernels are not measured, not claimed.
- **Non-bwrap degraded mode**: out.log is not protected from task writes (`chattr +i` blocks all writes including pre-opened handles — EXP-8 architecture verdict). landlock is on the roadmap (EXP pending).
- **macOS**: covered by [dsh-macos](https://github.com/Wang-Lin-Chang/dsh-macos) — sandbox-exec deny view + uchg (12-scenario acceptance 34/34).
- **Offline applicability**: all sandbox mechanisms are local syscalls (chattr/bwrap), no network components; multi-day offline runs are not measured, not claimed.
- **bwrap mount order is the truth-source order** (EXP-9 lesson): `ro-bind / → tmpfs /tmp → ro-bind jobDir`.

## Development

```sh
npm test   # 12-scenario acceptance, Linux edition (needs bubblewrap; see EXPERIMENTS.md environment prep)
```

## License

Apache-2.0
