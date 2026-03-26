# Prototype Alignment Plan

**Document:** Prototype-to-Implementation Alignment  
**Version:** 1.0  
**Date:** March 2026

---

## 1. Purpose

This document maps the enterprise prototype design to the implemented codebase, tracking which screens have been built, which APIs power them, and any deviations from the original prototype.

---

## 2. Prototype-to-Implementation Mapping

| Prototype Screen | Implemented Page | Route | Status | Notes |
|-----------------|------------------|-------|--------|-------|
| Executive Dashboard | Dashboard.jsx | `/dashboard` | ✅ Complete | Connected to `/api/dashboard/summary` and `/api/dashboard/executive-summary` |
| KPI Workspace | KPIConfig/index.jsx | `/kpi-config` | ✅ Complete | 3 sub-components: KPIRegistryTable, FormulaArchitect, KPIDetailPanel |
| Scheme Builder | SchemeManagement/index.jsx | `/scheme-management` | ✅ Complete | 4-step wizard with program preview |
| Review & Approve | ReviewAdjustments.jsx | `/review-adjustments` | ✅ Complete | Detail drawer + adjustment drawer |
| Exception Monitor | ExceptionLog.jsx | `/exception-log` | ✅ Complete | Paginated with severity badges |
| Organization Map | OrgDomainMapping.jsx | `/org-domain-mapping` | ✅ Complete | 4 grouped views (region, channel, branch, designation) |
| System Health | SystemStatus page | `/system-status` | ✅ Complete | Database, sync, integration health cards |
| Notification Center | Notifications page | `/notifications` | ✅ Complete | Unread count, mark-read actions |
| Payout Console | PayoutDisbursement | `/payouts` | ✅ Complete | Rule management + disbursement workflow |
| Integration Hub | IntegrationDashboard | `/integration` | ✅ Complete | Inbound/outbound monitoring |
| Settings | Settings page | `/settings` | ✅ Complete | Application preferences |

---

## 3. Design System Alignment

| Prototype Element | Implementation | Token |
|-------------------|----------------|-------|
| Sidebar color | `#1E2A78` | `--color-sidebar` |
| Action button | `#1D4ED8` | `--color-action-blue` |
| Background | `#F5F7FB` | `--color-ent-bg` |
| Surface/cards | `#FFFFFF` | `--color-ent-surface` |
| Border | `#E6EAF2` | `--color-ent-border` |
| Text | `#0F172A` | `--color-ent-text` |
| Muted text | `#667085` | `--color-ent-muted` |
| Success | `#7AD67A` | `--color-ent-success` |
| Hold/warning | `#D6A15C` | `--color-ent-hold` |
| Exception | `#7A3E00` | `--color-ent-exception` |
| Font | Inter (Google Fonts) | — |

Enterprise design system defined in `client/src/styles/design-system.css` using Tailwind v4 `@theme` directive.

24 UI components exported from `client/src/components/ui/index.js`.

---

## 4. Navigation Structure Alignment

| Prototype Sidebar Group | Implemented Group | Screens |
|------------------------|-------------------|---------|
| OVERVIEW | OVERVIEW | Dashboard |
| CONFIGURATION | CONFIGURATION | KPI Config, Scheme Management, Org & Domain Mapping |
| OPERATIONS | OPERATIONS | Review & Adjustments, Exception Log |
| PAYOUTS | PAYOUTS | Payout Disbursement |
| MONITORING | MONITORING | Integration Monitor, System Status, Notifications |
| ADMIN | ADMIN | Settings |

Layout uses `client/src/components/layout/AppShell.jsx` (enterprise layout with collapsible sidebar, mobile hamburger, blue header).

---

## 5. API Alignment

| Prototype Data Need | Implemented API | Status |
|--------------------|----------------|--------|
| Dashboard KPI cards | `GET /api/dashboard/executive-summary` | ✅ |
| KPI registry table | `GET /api/kpi-config/registry` | ✅ |
| KPI validation | `POST /api/kpi-config/:id/validate` | ✅ |
| Program preview | `GET /api/programs/:id/preview` | ✅ |
| Review list with adjustments | `GET /api/review-adjustments` | ✅ |
| Manual adjustment | `POST /api/review-adjustments/:id/adjust` | ✅ |
| Hold/release | `POST /api/review-adjustments/:id/hold`, `/release` | ✅ |
| Batch approve | `POST /api/review-adjustments/batch-approve` | ✅ |
| Exception list | `GET /api/exception-log` | ✅ |
| Exception resolve | `POST /api/exception-log/:id/resolve` | ✅ |
| System health | `GET /api/system-status/summary` | ✅ |
| Notifications | `GET /api/notifications` | ✅ |
| Org mapping | `GET /api/org-domain-mapping` | ✅ |

---

## 6. Deviations from Prototype

| Area | Deviation | Reason |
|------|-----------|--------|
| Hold status | Virtual (derived from additive records) instead of a status column | Preserves base calculation integrity |
| Adjustment display | Shown as separate line items, not merged into calculated amount | Maintains audit trail transparency |
| Notification preferences | Not implemented (planned for future) | Scope reduced for initial release |
| Role-based dashboard views | Not implemented | Uses `userAuth` for all users; role restrictions planned |

---

## Related Documents

- [UI_REDESIGN_EXECUTION_PLAN.md](./UI_REDESIGN_EXECUTION_PLAN.md) — Phased rollout plan
- [BACKEND_SAFE_EXTENSION_NOTES.md](./BACKEND_SAFE_EXTENSION_NOTES.md) — Safe extension risk analysis
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Section 11: Enterprise Module Overview
