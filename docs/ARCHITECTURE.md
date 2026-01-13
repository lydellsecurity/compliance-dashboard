# Modular Compliance Engine - Live Regulatory Update System
## Complete Architecture Documentation

---

## 1. Single Source of Truth Architecture

The system maintains strict separation between **Framework Requirements** (external law) and **Internal Controls** (company actions):

```
┌─────────────────────────────────────────────────────────────────┐
│              MASTER REQUIREMENT LIBRARY (Immutable)             │
│  ─────────────────────────────────────────────────────────────  │
│  • Versioned requirements from official sources                 │
│  • HIPAA_2024 vs HIPAA_2026_update                             │
│  • Changes create NEW versions, never modify existing          │
└─────────────────────────────────────────────────────────────────┘
                              ↕
                    N-to-N CROSSWALK MAPPING
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│              INTERNAL CONTROL LIBRARY (Mutable)                 │
│  ─────────────────────────────────────────────────────────────  │
│  • Company's implementations to meet requirements               │
│  • Updated as systems and processes change                      │
│  • Linked to evidence and assessments                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Models

### Framework Version Schema
```json
{
  "frameworkType": "HIPAA_SECURITY",
  "version": "2026_update",
  "effectiveDate": "2026-06-01",
  "sunsetDate": null,
  "status": "final",
  "sourceUrl": "https://hhs.gov/hipaa/2026",
  "lastVerified": "2026-01-13"
}
```

### Master Requirement Schema
```json
{
  "id": "REQ-HIPAA-SEC-164.312.d-2026",
  "frameworkId": "HIPAA_SECURITY",
  "frameworkVersion": { "version": "2026_update" },
  "sectionCode": "164.312(d)",
  "requirementText": "Implement multi-factor authentication...",
  "category": "ZERO_TRUST",
  "riskLevel": "critical",
  "supersedes": "REQ-HIPAA-SEC-164.312.d-2024",
  "keywords": ["MFA", "FIDO2", "phishing-resistant"]
}
```

### 2026 Category Types
- `AI_TRANSPARENCY` - EU AI Act model documentation
- `AI_RISK_CLASSIFICATION` - High-risk AI systems
- `QUANTUM_READINESS` - Post-quantum cryptography
- `ZERO_TRUST` - Continuous authentication
- `HUMAN_OVERSIGHT` - AI decision oversight
- `ALGORITHMIC_AUDIT` - AI audit trails
- `TRADITIONAL` - Pre-2026 standard controls

---

## 3. N-to-N Mapping Logic

### Crosswalk Service API
```typescript
class CrosswalkMappingService {
  // Get all controls satisfying a requirement
  getControlsForRequirement(reqId: string): MasterControl[]
  
  // Get all requirements satisfied by a control  
  getRequirementsForControl(ctrlId: string): MasterRequirement[]
  
  // Process update and detect drift
  processRequirementUpdate(
    oldReq: MasterRequirement,
    newReq: MasterRequirement,
    userResponses: Map<string, UserResponse[]>
  ): ComplianceDrift | null
}
```

### HIPAA MFA Update Flow
```
1. AI Scanner detects HIPAA 2026 MFA requirement change
2. System compares 164.312.d-2024 vs 164.312.d-2026
3. Analyzes change: "requirement_strengthened", impact: "critical"
4. Finds controls mapped to old requirement (CTRL-AC-001)
5. Checks user responses against new keywords (MFA, FIDO2, continuous)
6. Creates ComplianceDrift alert with:
   - Affected controls list
   - Non-compliant user responses
   - Required remediation actions
7. UI displays side-by-side comparison for admin review
```

---

## 4. Compliance Drift Detection

When requirements change, the system identifies gaps:

```
┌────────────────────────────────────────────────────────────────┐
│  DRIFT ALERT: HIPAA 164.312(d)                    🔴 CRITICAL  │
├────────────────────────────────────────────────────────────────┤
│  Version: 2024 → 2026_update                                   │
│  Change: "requirement_strengthened"                            │
│                                                                │
│  Gap Analysis:                                                 │
│  ────────────────                                              │
│  ✗ Previous response mentions "password + SMS OTP"            │
│    → New requirement mandates phishing-resistant MFA          │
│  ✗ No continuous authentication implemented                   │
│    → Now required for high-risk sessions                      │
│                                                                │
│  Affected Controls: CTRL-AC-001, CTRL-AC-003                  │
│                                                                │
│  Required Actions:                                             │
│  1. [HIGH] Deploy FIDO2/WebAuthn for privileged accounts      │
│  2. [HIGH] Remove SMS as sole second factor                   │
│  3. [MEDIUM] Implement risk-based step-up authentication      │
├────────────────────────────────────────────────────────────────┤
│  [Acknowledge]  [Accept Risk]  [Start Remediation]            │
└────────────────────────────────────────────────────────────────┘
```

### Visual Indicators
| Icon | Meaning |
|------|---------|
| 🔴 | Critical - Immediate action required |
| 🟠 | High - Remediate within 30 days |
| 🟡 | Medium - Gap exists, workaround available |
| 🔵 | Low - Informational update |
| ✓ | Response meets new requirement |
| ⚠️ | Response needs review |
| ✗ | Response does NOT meet requirement |

---

## 5. AI Regulatory Scanning Agent

### System Prompt
```
You are a Regulatory Compliance Intelligence Agent specializing in 
cybersecurity, data privacy, and AI governance regulations.

Scan official sources for regulatory changes:
- NIST (nist.gov, csrc.nist.gov)
- HHS/OCR (hhs.gov/hipaa)
- AICPA (aicpa.org)
- EU Parliament (eur-lex.europa.eu)

2026 Focus Areas:
- AI Transparency (EU AI Act enforcement)
- Post-Quantum Cryptography (NIST PQC standards)
- Zero Trust Architecture mandates
- Supply Chain Security requirements

Output: JSON array of detected changes for automated processing.
```

### Change Log Output
```json
[
  {
    "changeId": "CHG-HIPAA-2026-MFA",
    "sourceUrl": "https://hhs.gov/hipaa/2026-security-update",
    "sourceType": "official_publication",
    "publishedDate": "2026-01-01",
    "frameworkType": "HIPAA_SECURITY",
    "affectedSections": ["164.312(d)", "164.312(a)(2)(i)"],
    "changeType": "requirement_strengthened",
    "changeSummary": "HHS mandates MFA for all ePHI access",
    "estimatedImpact": "critical",
    "affectedControlFamilies": ["Access Control"],
    "suggestedActions": [
      "Implement FIDO2/WebAuthn for privileged accounts",
      "Phase out SMS-based OTP",
      "Deploy continuous authentication"
    ],
    "aiConfidenceScore": 95,
    "requiresHumanReview": true,
    "category2026": "ZERO_TRUST"
  }
]
```

---

## 6. 2026-Specific Extensions

### AI Transparency (EU AI Act)
```typescript
interface AIControlDetails {
  aiSystemId: string;
  riskClassification: 'high_risk' | 'limited_risk' | 'minimal_risk';
  modelDocumentation: {
    trainingDataDescription: string;
    trainingDataSources: string[];
    biasAssessmentDate: string;
    biasAssessmentResults: string;
  };
  explainabilityMethod: string;  // "SHAP", "LIME", etc.
  humanOversightMechanism: string;
  euDatabaseRegistration?: string;
}
```

### Quantum Readiness
```typescript
interface QuantumReadinessDetails {
  currentEncryptionAlgorithms: string[];  // ["RSA-4096", "AES-256"]
  quantumVulnerableAssets: string[];
  postQuantumAlgorithms: string[];  // ["CRYSTALS-Kyber", "CRYSTALS-Dilithium"]
  migrationStatus: 'assessment' | 'planning' | 'pilot' | 'migration' | 'complete';
  migrationDeadline: string;
  cryptoAgilityScore: 1 | 2 | 3 | 4 | 5;
}
```

### Zero Trust
```typescript
interface ZeroTrustDetails {
  continuousAuthEnabled: boolean;
  authenticationMethods: string[];  // ["FIDO2", "Authenticator"]
  sessionDuration: number;  // 0 = continuous
  riskBasedAuthentication: boolean;
  microsegmentationEnabled: boolean;
  deviceTrustRequired: boolean;
  behaviorAnalytics: boolean;
}
```

---

## 7. Version Control UI

### Side-by-Side Comparison
```
┌─────────────────────────────────────────────────────────────────┐
│  REQUIREMENT UPDATE                              [PENDING]      │
│  HIPAA 164.312(d) - Person or Entity Authentication            │
├───────────────────────────┬─────────────────────────────────────┤
│      CURRENT (v2024)      │         NEW (v2026_update)          │
├───────────────────────────┼─────────────────────────────────────┤
│ "Implement procedures to  │ "Implement multi-factor             │
│ verify that a person or   │ authentication (MFA) for all        │
│ entity seeking access to  │ access to electronic protected      │
│ electronic protected      │ health information.                 │
│ health information is     │                                     │
│ the one claimed."         │ MFA must include at least two of:   │
│                           │ (1) something the user knows        │
│                           │ (2) something the user has          │
│                           │ (3) something the user is           │
│                           │                                     │
│                           │ Phishing-resistant methods          │
│                           │ (FIDO2/WebAuthn) required for       │
│                           │ privileged access."                 │
├───────────────────────────┴─────────────────────────────────────┤
│  IMPACT: 3 controls • 5 responses need review                   │
├─────────────────────────────────────────────────────────────────┤
│              [Defer]    [Reject]    [✓ Accept & Apply]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Adding New Frameworks (Zero Refactoring)

To add CCPA 2.0 or any new framework:

```typescript
// 1. Add framework type (one line)
type FrameworkType = ... | 'CCPA_2_0';

// 2. Add scanning source
REGULATORY_SOURCES.push({
  id: 'ccpa-2-0',
  name: 'CCPA 2.0 / CPRA',
  url: 'https://oag.ca.gov/privacy/ccpa',
  framework: 'CCPA_2_0',
  scanFrequency: 'weekly',
  keywords: ['CCPA', 'CPRA', 'California privacy'],
});

// 3. Create requirements (standard schema)
const ccpaRequirement: MasterRequirement = {
  id: 'REQ-CCPA-2.0-001',
  frameworkId: 'CCPA_2_0',
  // ... standard fields
};

// 4. Map to controls (standard mapping)
const mapping: RequirementControlMapping = {
  requirementId: 'REQ-CCPA-2.0-001',
  controlId: 'CTRL-PRIV-001',
  mappingType: 'partial',
};

// NO ENGINE CHANGES REQUIRED!
```

---

## 9. File Structure

```
compliance-engine/
├── src/
│   ├── types/
│   │   └── compliance.types.ts      # All interfaces
│   ├── services/
│   │   ├── crosswalk.service.ts     # N-to-N mapping
│   │   └── regulatory-scanner.service.ts
│   ├── components/
│   │   └── VersionControlUI.tsx     # React components
│   └── data/
│       └── sample-requirements-2026.ts
├── docs/
│   └── ARCHITECTURE.md
└── package.json
```

---

## 10. Quick Start

```bash
# Install
npm install

# Set environment
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Run development
npm run dev

# Trigger regulatory scan
curl -X POST /api/regulatory-scan
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| **MasterRequirement** | Immutable regulatory requirements with versioning |
| **MasterControl** | Mutable company implementations |
| **CrosswalkMapping** | N-to-N relationship between requirements and controls |
| **ComplianceDrift** | Detected gaps when requirements change |
| **AI Scanner** | Automated regulatory change detection |
| **Version Control UI** | Admin workflow for accepting/rejecting updates |
| **2026 Extensions** | AI, Quantum, Zero Trust specific fields |
