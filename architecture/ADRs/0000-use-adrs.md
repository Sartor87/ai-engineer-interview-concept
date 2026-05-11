# 0. Use Architecture Decision Records

**Status:** Accepted  
**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

As the project evolves, decisions about technology, patterns, and trade-offs accumulate. Without a structured record, the rationale behind choices becomes tribal knowledge, making it hard for new contributors to understand why things are the way they are, and easy to re-debate settled questions.

## Decision

We will document all significant architecture decisions as ADRs stored in `architecture/ADRs/`. Each ADR captures the context, the options considered, the decision made, and the consequences.

ADRs are:
- Numbered sequentially (`ADR-NNNN`)
- Written at the time the decision is made
- Immutable once accepted — superseded by a new ADR, never edited retroactively
- Short — one decision per document

## Consequences

- New contributors can understand the history and reasoning behind the architecture without asking.
- Decisions are not re-litigated unless a new ADR explicitly supersedes an existing one.
- There is a small overhead of writing an ADR for each significant decision.
