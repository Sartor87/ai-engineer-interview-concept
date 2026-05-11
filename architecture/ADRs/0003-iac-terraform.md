# ADR-0003: Infrastructure as Code — Terraform over Bicep

**Status:** Accepted  
**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

Azure infrastructure needs to be expressed as code for reproducible deployments. The two primary options for this project are Azure Bicep (Azure-native DSL) and Terraform (cloud-agnostic HCL).

## Options Considered

### Option A: Terraform ✅
| Dimension | Assessment |
|---|---|
| Team familiarity | High — team has substantial AWS + Terraform experience |
| Cloud agnostic | Yes — same toolchain regardless of provider |
| Azure support | `azurerm` provider is mature and comprehensive |
| State management | Remote state via backend (Terraform Cloud, Azure Blob, S3) |
| Ecosystem | Large provider ecosystem, modules, community |

### Option B: Azure Bicep
| Dimension | Assessment |
|---|---|
| Team familiarity | Low — team had no prior Bicep experience |
| Azure-native | Yes — first-class Azure tooling, no state file required |
| Cloud agnostic | No — Azure only |
| Learning curve | Moderate — new DSL to learn |
| Tooling | Azure CLI / VS Code Bicep extension |

## Decision

**Terraform** with the `azurerm` provider.

The team already has deep Terraform knowledge from AWS projects. Reusing that knowledge eliminates onboarding cost. The `azurerm` provider covers all resources used by this project (`azurerm_resource_group`, `azurerm_static_web_app`). The cloud-agnostic nature of Terraform also keeps future flexibility open if the hosting platform changes.

## Consequences

- A Terraform state backend should be configured before team-wide use (currently local state for solo development).
- Bicep's advantage of no state file is forfeited — state must be managed carefully.
- All Azure resource changes go through `terraform apply`; manual portal changes will cause state drift.
