# 2. Backend Runtime — .NET 8 over .NET 10 or Next.js

**Status:** Accepted  
**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

The Azure Functions backend required a runtime choice. Three realistic options were evaluated: .NET 10 (latest), .NET 8 LTS (previous LTS), and a full Next.js API routes approach.

## Options Considered

### Option A: .NET 10
| Dimension | Assessment |
|---|---|
| Currency | Latest release |
| LTS | No — standard-term support only |
| Package ecosystem | Unstable at time of decision — several NuGet packages publish version numbers that do not exist on the feed (e.g. `Microsoft.Extensions.Http 10.0.7` caused build failure in this project) |
| Azure Functions compatibility | Worker SDK lagging behind .NET 10 at time of decision |

### Option B: .NET 8 LTS ✅
| Dimension | Assessment |
|---|---|
| LTS | Yes — supported until November 2026 |
| Package ecosystem | Stable, all packages available |
| Azure Functions compatibility | Full support — isolated worker model well documented |
| Team familiarity | High |

### Option C: Next.js (API Routes)
| Dimension | Assessment |
|---|---|
| Team familiarity | Low — team lacked sufficient Next.js experience |
| Existing code | Significant .NET codebase already in place at evaluation time |
| Migration cost | High — would require rewriting existing backend logic |
| SSE streaming | Supported via Next.js `Response` streaming but less mature than .NET HttpClient |

## Decision

**.NET 8 (LTS)** with the Azure Functions isolated worker model.

.NET 10 was ruled out after a concrete build failure caused by non-existent NuGet package versions — a signal that the ecosystem had not stabilised for production use at the time of this decision. Next.js was ruled out due to team knowledge gaps and the cost of migrating existing code.

## Consequences

- LTS support expires November 2026 — a migration to .NET 10 or .NET 12 LTS will be required before then.
- The isolated worker model requires `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore` for ASP.NET Core HTTP semantics (`HttpRequest` / `IActionResult`).
- SSE streaming is handled by writing directly to `HttpContext.Response.Body`.
