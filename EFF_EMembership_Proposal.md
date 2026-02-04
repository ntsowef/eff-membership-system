## Statement of Work (SoW): Development of the EFF E‑Membership System (South Africa)
**Prepared for:** Economic Freedom Fighters (EFF)  
**Prepared by:** Bakkie Connect  
**Date:** 31 Jan 2026  
**Currency:** ZAR (R)

---

### Project Parameters (Confirmed)
- **Delivery tier:** Enterprise
- **Expected scale:** 1,000,000+ members
- **Channel:** Purely online (no offline/branch capture in this scope)
- **Payments:** PayFast
- **WhatsApp:** Separate project (out of scope for this SoW)

### 1) Executive Summary
We propose the design, development, and deployment of an **EFF E‑Membership System** that digitises the full membership lifecycle (join → verify → active → renew/expire) and enables scalable communications (Email/SMS) with reporting, governance, and enterprise‑grade scalability.

**Key outcomes:** improved data quality, faster verification, reduced manual work, stronger member self‑service, auditable administration.

---

### 2) Goals & Success Criteria
**Goals**
- Digitise membership lifecycle and renewals
- Centralise member records and enforce data validation
- Provide a secure admin dashboard with role‑based access
- Provide member self‑service portal (purely online)
- Enable bulk messaging with preferences, logging, and tracking (provider dependent)

**Success criteria (examples)**
- >95% successful registration submissions without manual correction
- Admin actions are fully auditable (who/what/when)
- Bulk comms can target filters (province/ward/status) with progress tracking

---

### 3) Solution Overview (High Level)
**Frontend (Portal + Admin)**
- Member portal (mobile‑friendly)
- Admin dashboard (operations, comms, reporting)

**Backend**
- API layer + business rules
- PostgreSQL database
- Audit logs + RBAC

**Channels**
- Email and SMS notifications (WhatsApp handled as a separate project)

---

### 4) Scope of Work
#### 4.1 Membership Management
- Member registration, validation, duplicate checks
- Membership number rules (as agreed)
- Status workflow (pending/approved/active/expired/suspended)
- Profile updates with change history

#### 4.2 Digital Membership Card
- Generate card (PNG and/or PDF) using approved EFF template
- Portal download (WhatsApp delivery is out of scope for this SoW)
- Optional QR / verification code

#### 4.3 Renewals & Payments (Recommended)
- Renewal workflow (annual/monthly configurable)
- **PayFast integration** (checkout, webhook handling, reconciliation reporting)
- Payment confirmation and renewal status updates

#### 4.4 Communications (Email/SMS)
- Preferences (opt‑in/out), templates, variables
- Send to individual member
- Bulk send to filtered segments (province/ward/status/etc.)
- Rate limiting + queueing for bulk sends
- Message logging + delivery status where supported by provider

#### 4.5 Reporting & Audit
- Dashboards and exportable reports (CSV/Excel)
- Audit trail for admin actions

#### 4.6 Security & Governance
- RBAC (roles/permissions), secure secret management
- Admin activity logs, basic POPIA-aligned controls

---

### 5) Delivery Plan & Timeline
We recommend a phased delivery to reduce risk and enable early value.

**Phase 1 — Discovery & Design (2–3 weeks)**
- Workshops, final scope, UX flows, data model, acceptance criteria

**Status:** Discovery workshop completed; scope confirmed as **Enterprise** and **purely online**.

**Phase 2 — MVP Build (6–10 weeks)**
- Core membership lifecycle, admin operations, reporting baseline

**Fast‑track item (ASAP): PayFast**
- PayFast integration can begin immediately on receipt of merchant configuration and approved callback URLs.
- Target is to deliver an end‑to‑end PayFast payment flow (checkout → notify/webhook → reconciliation view) as an early milestone.

**Phase 3 — Comms + Card Automation (and PayFast completion where required) (4–8 weeks)**
- Bulk messaging, templates, logging, card delivery; complete any remaining PayFast items discovered during UAT

**Phase 4 — Hardening, Training, Go‑Live (2–4 weeks)**
- QA/UAT support, security hardening, documentation, production rollout

**Enterprise add‑ons (included for 1M+ scale):**
- Performance testing and optimisation
- Background job queueing for bulk operations
- Database indexing strategy + ongoing query profiling
- Observability (metrics/logging) baseline and alerting

**Estimated timeline:** **14–25 weeks** (depends on UAT speed and selected options)

---

### 6) Costing (ZAR)
#### 6.1 One‑Time Development (CAPEX)
**Enterprise (Selected) — Fixed Implementation Price:** **R3,900,000**

This fixed price covers delivery of the scope in this SoW for a **purely online** platform at **1,000,000+ member** scale, including **PayFast integration**, performance engineering, and go‑live support.

#### 6.2 Monthly Operating Costs (OPEX)
**Fixed Monthly Support & Maintenance Retainer:** **R30,000 / month**

**Infrastructure & platform costs (pass‑through / billed at cost):** Budget **R95,000 / month**
- Cloud hosting (app/API)
- Managed PostgreSQL
- Queueing/caching (if required)
- Monitoring, backups, alerting

> Note: actual infrastructure spend can be tuned up/down depending on live traffic patterns and hosting choices.

#### 6.3 Variable Pass‑Through Costs (Usage Based)
- SMS per-message costs (if enabled)
- Email provider costs (for high volume)
- PayFast transaction fees

#### 6.4 Indicative Year‑1 Total (Enterprise Package)
- **Implementation (fixed):** R3,900,000
- **Support retainer (12 months):** R360,000
- **Infrastructure budget (12 months):** R1,140,000
- **Year‑1 total (budget):** **R5,400,000** *(excludes variable messaging + PayFast transaction fees)*

---

### 7) Commercial Terms (Typical)
**Milestone option**
- 40% on kickoff (**R1,560,000**)
- 40% on MVP (UAT‑ready) (**R1,560,000**)
- 20% on production go‑live (**R780,000**)

**Change control:** any scope additions/changes will be estimated and approved before implementation.

---

### 8) Deliverables
- Member portal + admin dashboard (production-ready)
- Backend API + PostgreSQL schema/migrations
- Communications module (Email/SMS)
- Membership card generation and delivery flows
- Reporting exports + dashboards
- Documentation (admin guide + technical handover)
- UAT support + production deployment runbook

---

### 9) Assumptions & Exclusions
**Assumptions**
- EFF provides branding assets, card templates, and content copy
- Stakeholders available for weekly reviews + UAT sign-off
- Final decisions provided for: hosting preference and PayFast account details (merchant configuration)

**Exclusions (unless added)**
- Contact-centre suite / omni-channel agent tooling
- Large-scale data cleansing beyond agreed imports
- Advanced fraud/biometric verification
- WhatsApp bot and WhatsApp bulk messaging (handled as a separate project)

---

### 10) Next Steps
1. ✅ Confirm scope aligned to **Enterprise tier** and **purely online** delivery (confirmed)
2. ✅ Discovery workshop completed
3. **PayFast (start ASAP): provide configuration to enable implementation**
   - PayFast Merchant ID + Merchant Key (sandbox and/or production)
   - Confirm environment: Sandbox vs Production
   - Approved URLs: Return URL, Cancel URL, Notify URL (ITN)
   - Settlement and reconciliation requirements (reporting fields + frequency)
   - Security requirements (IP allowlist / signature verification approach)
4. Kick off PayFast implementation immediately once item (3) is received and validated

