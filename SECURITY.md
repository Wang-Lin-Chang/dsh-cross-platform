# Security Policy

## Supported versions

Latest tag only. Early public preview — breaking changes may occur.

## Reporting a vulnerability

Private reporting only: https://github.com/Wang-Lin-Chang/dsh-cross-platform/security/advisories/new

Include: affected version, reproduction steps, impact.

## Scope

Reportable when an attacker can:

- Escape the bubblewrap read-only view or the chattr-immutable protections in a task context
- Forge the lock/exit protocol without detection
- Make the runner write outside the job directory

## Out of scope

- Capability-based escapes that require root or CAP_LINUX_IMMUTABLE in the host (documented boundary)
- Non-bwrap degraded mode out.log overwrite (documented in README; landlock on the roadmap)
