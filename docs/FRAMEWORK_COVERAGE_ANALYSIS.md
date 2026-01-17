# Framework Coverage Analysis

**Generated:** January 17, 2026
**Purpose:** Identify gaps in compliance framework coverage

---

## Executive Summary

The current control library has **236 master controls** with mappings to 6 compliance frameworks. However, our analysis reveals that while controls are mapped, **not all framework-specific requirements have coverage**.

The correct model should be:
- **Framework-centric**: Each framework requirement should map to at least one control
- **Not all controls need all frameworks**: Some controls only apply to specific frameworks
- **100% framework coverage**: Every requirement in each framework should have representation

---

## Current State Analysis

### Mapping Statistics

| Framework | Unique Clauses Mapped | Framework Requirements | Coverage Status |
|-----------|----------------------|----------------------|-----------------|
| SOC 2 | 35 | 61 criteria | **57% - GAPS** |
| ISO 27001 | 89 (mixed versions) | 93 controls | ~96% (version inconsistency) |
| HIPAA | 54 | 49 specs | >100% (overcounting) |
| NIST CSF | 71 | 106 subcategories | **67% - GAPS** |
| PCI DSS | 142 | 64 requirements | >100% (granular mapping) |
| GDPR | 43 | 65 provisions | **66% - GAPS** |

---

## SOC 2 Trust Services Criteria - Gap Analysis

### Criteria WITH Coverage (35)
CC1.1, CC1.4, CC2.1, CC2.3, CC3.1, CC3.2, CC4.1, CC4.2, CC5.2, CC5.3, CC6.1-CC6.8, CC7.1-CC7.5, CC8.1, CC9.2, A1.1-A1.3, P1.1, P2.1, P3.1, P4.1, P5.1, P6.1, P7.1

### Criteria WITHOUT Coverage (26) ⚠️

**Common Criteria:**
- CC1.2: Board Independence
- CC1.3: Management Structures
- CC1.5: Accountability Enforcement
- CC2.2: Internal Communication
- CC3.3: Fraud Risk Assessment
- CC3.4: Significant Change Analysis
- CC5.1: Control Activity Selection
- CC9.1: Business Disruption Risk

**Confidentiality:**
- C1.1: Identifies Confidential Information
- C1.2: Disposes of Confidential Information

**Processing Integrity:**
- PI1.1-PI1.5: All Processing Integrity criteria

**Privacy:**
- P3.2: Implicit Consent Notice
- P4.2: Personal Information Retention
- P4.3: Secure Disposal
- P5.2: Correction/Amendment Rights
- P6.2-P6.7: Disclosure and Notification criteria
- P8.1: Privacy Compliance Monitoring

---

## NIST CSF 2.0 - Gap Analysis

### Subcategories WITH Coverage (~71)
Various ID, PR, DE, RS, RC subcategories

### Notable Missing Subcategories ⚠️

**GOVERN Function (New in 2.0):**
- GV.OC-01 to GV.OC-05: Organizational Context
- GV.RM-01 to GV.RM-07: Risk Management Strategy
- GV.RR-01 to GV.RR-04: Roles, Responsibilities, Authorities
- GV.PO-01, GV.PO-02: Policy
- GV.OV-01 to GV.OV-03: Oversight
- GV.SC-01 to GV.SC-10: Supply Chain Risk Management

This represents ~31 missing subcategories from the GOVERN function alone.

---

## ISO 27001:2022 - Version Inconsistency

### Issue
The current mappings use a mix of:
- **2022 format**: A.5.x, A.6.x, A.7.x, A.8.x (correct)
- **2013 format**: A.12.x, A.13.x (old, should be migrated)

### Recommendation
Migrate all ISO 27001 mappings to 2022 Annex A structure:
- A.5: Organizational Controls (37)
- A.6: People Controls (8)
- A.7: Physical Controls (14)
- A.8: Technological Controls (34)

---

## GDPR - Gap Analysis

### Articles WITH Coverage
Art.5(1)(c-f), Art.12, Art.13, Art.17, Art.24, Art.25, Art.28, Art.29, Art.30, Art.32, Art.33, Art.34, Art.35, Art.37-39

### Articles/Provisions WITHOUT Coverage ⚠️

**Data Subject Rights:**
- Art.15: Right of Access
- Art.16: Right to Rectification
- Art.18: Right to Restriction
- Art.20: Right to Data Portability

**Lawfulness & Consent:**
- Art.6: Lawfulness of Processing
- Art.7: Conditions for Consent

**International Transfers:**
- Art.44-49: Transfer mechanisms

---

## Recommendations

### Phase 1: Fix Critical Gaps (Immediate)

1. **Add SOC 2 Missing Criteria**
   - Add controls for C1.1, C1.2 (Confidentiality)
   - Add controls for PI1.1-PI1.5 (Processing Integrity)
   - Map existing controls to CC1.2, CC1.3, CC1.5, CC2.2, CC3.3, CC3.4, CC5.1, CC9.1

2. **Add NIST CSF 2.0 GOVERN Function**
   - Add 31+ subcategories for the new GOVERN function
   - This is critical as GOVERN is new in CSF 2.0

3. **Add GDPR Data Subject Rights**
   - Add controls for Articles 15, 16, 18, 20
   - These are critical GDPR requirements

### Phase 2: Standardize Mappings (Short-term)

1. **Migrate ISO 27001 to 2022 Format**
   - Convert all A.12.x, A.13.x references to new A.8.x structure

2. **Remove Inappropriate Cross-Mappings**
   - Not every control should map to every framework
   - Physical security controls may not need GDPR mappings
   - HR controls may not need PCI DSS mappings

### Phase 3: Validate Coverage (Medium-term)

1. **Create automated coverage checker**
   - Compare framework-requirements.ts against actual mappings
   - Generate gap reports automatically

2. **Add framework-specific controls**
   - Some framework requirements need dedicated controls
   - Example: Processing Integrity (SOC 2) needs specific controls

---

## Framework-Specific Control Requirements

### Controls That Should Exist But Don't

| Framework | Requirement | Suggested Control |
|-----------|-------------|-------------------|
| SOC 2 | PI1.1-PI1.5 | Processing Integrity controls |
| SOC 2 | C1.1, C1.2 | Confidentiality classification controls |
| NIST CSF 2.0 | GV.* | Governance controls (31+) |
| GDPR | Art.15 | Right of Access handling |
| GDPR | Art.20 | Data Portability mechanism |
| PCI DSS | 9.5 | POI device protection |

---

## Action Items

- [x] Add ~40-50 new controls for missing framework requirements (COMPLETED: Added 51 controls)
- [x] Migrate ISO 27001 to 2022 format (COMPLETED: 57 mappings updated)
- [ ] Update ~30 existing controls with corrected framework mappings (Future optimization)
- [ ] Remove ~50 inappropriate cross-mappings (Future optimization - requires domain review)
- [ ] Create automated coverage validation tool
- [ ] Document framework mapping methodology

---

## Completed Actions (January 17, 2026)

### New Controls Added (51 total)
| Category | Control IDs | Count | Coverage |
|----------|-------------|-------|----------|
| Processing Integrity | PI-001 to PI-005 | 5 | SOC 2 PI1.1-PI1.5 |
| Confidentiality | CF-001 to CF-002 | 2 | SOC 2 C1.1-C1.2 |
| Governance | GV-001 to GV-030 | 30 | NIST CSF 2.0 GOVERN |
| Data Subject Rights | DSR-001 to DSR-006 | 6 | GDPR Art.15,16,18,20 |
| SOC 2 Missing Criteria | SOC-001 to SOC-008 | 8 | CC1.2,CC1.3,CC1.5,CC2.2,CC3.3,CC3.4,CC5.1,CC9.1 |

### ISO 27001 Migration
- Migrated 57 control mappings from ISO 27001:2013 to 2022 format
- Old A.12.x (Operations) → A.8.x (Technological)
- Old A.13.x (Communications) → A.8.x (Technological)

### Current Control Count: 305 controls

---

*This analysis reveals that true "100% framework coverage" requires framework-centric thinking, not control-centric thinking. Each framework should have all its requirements mapped, even if that means some frameworks have fewer total mappings than others.*
