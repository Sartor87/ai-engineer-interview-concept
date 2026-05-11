terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "location" {
  description = "Azure region. Must support Static Web Apps."
  type        = string
  default     = "West Europe"
}

variable "resource_group_name" {
  description = "Name of the resource group."
  type        = string
  default     = "rg-ai-interview"
}

variable "app_name" {
  description = "Name of the Static Web App. Must be globally unique."
  type        = string
  default     = "ai-interview-guide"
}

variable "stihia_api_key" {
  description = "Stihia API key (sk_...). Get one at app.stihia.ai → Organization → API Keys."
  type        = string
  sensitive   = true
}

variable "disable_guardrails" {
  description = "Set to true to bypass Stihia guardrail checks (dev/testing only)."
  type        = string
  default     = "false"

  validation {
    condition     = contains(["true", "false"], var.disable_guardrails)
    error_message = "disable_guardrails must be \"true\" or \"false\"."
  }
}

# ── Resources ─────────────────────────────────────────────────────────────────

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_static_web_app" "main" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  sku_tier = "Free"
  sku_size = "Free"

  app_settings = {
    STIHIA_API_KEY     = var.stihia_api_key
    DISABLE_GUARDRAILS = var.disable_guardrails
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "app_url" {
  description = "Public URL of the deployed app."
  value       = "https://${azurerm_static_web_app.main.default_host_name}"
}

output "deployment_token" {
  description = "Add this as AZURE_STATIC_WEB_APPS_API_TOKEN in GitHub Actions secrets."
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
