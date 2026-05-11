# ADR-0001: Cloud Provider — Azure over AWS

## Status

Accepted

Links to [0003](0003-iac-terraform.md)

**Date:** 2026-05-11  
**Deciders:** Engineering team

## Context

The project requires hosting for a static frontend, a serverless API backend, and a CI/CD pipeline. A cloud provider had to be chosen early as it shapes infrastructure tooling, deployment targets, and available managed services.

## Options Considered

### Option A: Microsoft Azure
| Dimension | Assessment |
|---|---|
| Team familiarity | High — existing Azure experience |
| Static + Functions hosting | Azure Static Web Apps bundles both in a single free-tier resource |
| Managed identity & secrets | Azure App Settings natively integrated |
| Free tier | SWA Free tier covers this project's scale |
| CI/CD | GitHub Actions integration first-class |

### Option B: AWS
| Dimension | Assessment |
|---|---|
| Team familiarity | Moderate — AWS experience exists but less recent |
| Equivalent hosting | S3 + CloudFront + Lambda — more resources to manage |
| Free tier | Lambda + S3 free tier viable but more complex to wire |
| CI/CD | GitHub Actions support good but less native than Azure |

### Option C: GCP / Other
Not seriously evaluated — team had no relevant experience.

## Decision

**Azure**, using **Azure Static Web Apps (Free tier)**.

Azure Static Web Apps is uniquely well-suited: it bundles static hosting, managed Azure Functions, custom domain, and CI/CD in a single resource with zero cost at this scale. The team's existing Azure familiarity removes onboarding friction.

## Consequences

- Infrastructure is expressed in Terraform targeting the `azurerm` provider.
- The Azure Functions runtime is constrained to the languages supported by SWA managed functions (.NET, Node, Python).
- Future multi-cloud or AWS migration would require significant infrastructure rework.

