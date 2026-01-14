# Lydell Security Compliance Dashboard - Comprehensive Functionality Guide

## Overview

The Lydell Security Compliance Dashboard is an enterprise-grade Governance, Risk, and Compliance (GRC) platform designed to help organizations manage their security compliance posture across multiple regulatory frameworks. The application supports SOC 2, ISO 27001, HIPAA, and NIST CSF 2.0 frameworks with a unified control assessment system.

---

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Dashboard & Command Center](#dashboard--command-center)
3. [Control Assessment System](#control-assessment-system)
4. [Framework Crosswalk](#framework-crosswalk)
5. [Evidence Management](#evidence-management)
6. [Policy Generation](#policy-generation)
7. [Incident Response Module](#incident-response-module)
8. [Reporting & Analytics](#reporting--analytics)
9. [Trust Center](#trust-center)
10. [Certificate Generation](#certificate-generation)
11. [Auditor Verification](#auditor-verification)
12. [Custom Controls](#custom-controls)
13. [Data Persistence](#data-persistence)
14. [Theme System](#theme-system)
15. [API & Backend Services](#api--backend-services)

---

## Core Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **State Management**: React hooks with context providers
- **Styling**: Tailwind CSS with custom design system ("Midnight & Steel" theme)
- **Animations**: Framer Motion
- **Backend**: Netlify Functions (serverless)
- **Database**: Supabase (PostgreSQL) with localStorage fallback
- **PDF Generation**: jsPDF with custom formatting
- **AI Integration**: Anthropic Claude API (claude-sonnet-4-20250514)

### Data Flow
```
User Action → React Hook → localStorage (immediate) → Supabase (background sync)
                                    ↓
                         Netlify Functions (for AI/PDF generation)
                                    ↓
                         Supabase Storage (evidence files)
```

---

## Dashboard & Command Center

### Location: `src/App.tsx` - DashboardTab component

The Command Center provides a high-level overview of the organization's compliance posture.

### Features

#### Overall Compliance Gauge
- **Visual Display**: Circular gauge showing assessment completion percentage
- **Calculation**: `(answered controls / total controls) × 100`
- **Metrics Shown**:
  - Total controls assessed
  - Compliant controls count
  - Remaining controls count

#### Active Gaps Panel
- Displays controls marked as "No" (non-compliant)
- Prioritized by risk level (Critical → High → Medium → Low)
- Shows up to 5 most critical gaps
- Click-through navigation to specific control

#### Framework Progress Crosswalk
- Four circular gauges for each framework:
  - **SOC 2** (violet #8b5cf6)
  - **ISO 27001** (emerald #10b981)
  - **HIPAA** (pink #ec4899)
  - **NIST CSF** (amber #f59e0b)
- Shows completed/total controls per framework
- Animated progress indicators

#### Domain Progress Grid
- Visual cards for each compliance domain
- Progress bars showing completion percentage
- Click to navigate to domain-specific assessment
- Completion checkmarks for 100% assessed domains

### Compliance Domains
1. Access Control
2. Asset Management
3. Audit Logging
4. Business Continuity
5. Change Management
6. Cryptography
7. Data Privacy
8. HR Security
9. Incident Response
10. Network Security
11. Physical Security
12. Risk Management
13. Company Specific (custom controls)

---

## Control Assessment System

### Location: `src/App.tsx` - AssessmentTab, ProtocolCard components

### Control Structure
Each control contains:
```typescript
interface MasterControl {
  id: string;              // e.g., "AC-001"
  title: string;           // Control name
  description: string;     // Detailed description
  question: string;        // Assessment question
  domain: ComplianceDomain;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  frameworkMappings: FrameworkMapping[];
  keywords: string[];
  guidance: string;        // Implementation guidance
  evidenceExamples: string[];
  remediationTip: string;
}
```

### Assessment Options
- **Yes**: Control is implemented (generates Evidence ID)
- **No**: Control is not implemented (triggers gap tracking)
- **Partial**: Control is partially implemented
- **N/A**: Control is not applicable

### Control Card Features
1. **Risk Level Badge**: Color-coded indicator (Critical=red, High=orange, Medium=blue, Low=gray)
2. **Framework Tags**: Shows which frameworks the control maps to
3. **Info Panel**: Expandable section with:
   - "Why This Matters" guidance
   - Evidence examples
4. **Remediation Panel**: Appears for "No" answers with:
   - Gap identification alert
   - Remediation tip
   - Free-text remediation plan field (auto-saves)
   - Link to Remediation Engine

### Search Functionality
- Global search across all controls
- Searches: Control ID, title, keywords
- Real-time filtering

---

## Framework Crosswalk

### Location: `src/constants/controls.ts`

### Supported Frameworks

#### SOC 2 Type II
- **Certification Body**: AICPA
- **Focus**: Security, Availability, Processing Integrity, Confidentiality, Privacy
- **Control Mappings**: CC (Common Criteria) series

#### ISO/IEC 27001:2022
- **Certification Body**: ISO
- **Focus**: Information Security Management Systems (ISMS)
- **Control Mappings**: Annex A controls (A.5 - A.18)

#### HIPAA
- **Certification Body**: HHS (Department of Health and Human Services)
- **Focus**: Healthcare data protection and privacy
- **Control Mappings**: Administrative, Physical, Technical safeguards

#### NIST CSF 2.0
- **Certification Body**: NIST
- **Focus**: Cybersecurity risk management
- **Control Mappings**: Identify, Protect, Detect, Respond, Recover functions

### Crosswalk Functionality
- Single control can satisfy multiple framework requirements
- Answering one control updates progress across all mapped frameworks
- Visual "sync notifications" show framework clause satisfaction in real-time

---

## Evidence Management

### Location: `src/App.tsx` - EvidenceTab component

### Evidence Record Structure
```typescript
interface EvidenceRecord {
  id: string;           // UUID format: "EVD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  controlId: string;
  controlResponseId: string;
  notes: string;
  status: 'draft' | 'review' | 'final';
  fileUrls: string[];   // Links to uploaded files
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  approvedAt: string | null;
}
```

### Features
1. **Automatic Evidence Generation**: "Yes" answers auto-create evidence records
2. **Evidence ID Display**: Unique identifier shown on control cards
3. **Status Workflow**:
   - Draft → Review → Final
   - Status change via dropdown
4. **Notes Field**: Free-text documentation (auto-saves)
5. **Policy PDF Links**: Direct links to generated policy documents
6. **File Upload**: Placeholder for document attachments
7. **Search & Filter**: By control ID, title, notes, or status

---

## Policy Generation

### Two Generation Methods

### 1. Template-Based Policy Generator
**Location**: `src/components/PolicyGenerator.tsx`

- Generates structured policy documents from templates
- Uses control metadata to populate sections
- Includes:
  - Policy header with version and date
  - Purpose statement
  - Scope definition
  - Policy requirements
  - Compliance statement
- Outputs as downloadable PDF

### 2. AI-Powered Policy Generator
**Location**: `src/components/AIPolicyGenerator.tsx`, `netlify/functions/generate-ai-policy.js`

#### Frontend Features
- Streaming text effect (simulated typing)
- Real-time generation progress
- Copy to clipboard functionality
- Download as PDF
- Save as evidence (uploads to Supabase)

#### Backend (Netlify Function)
- **Model**: Claude claude-sonnet-4-20250514 (Anthropic)
- **System Prompt**: GRC Auditor persona
- **Output Format**: Legally-defensible security policy

#### Generated Policy Sections
1. **Header**: Policy name, version, effective date
2. **Purpose**: Security objective definition
3. **Scope**: Systems and personnel covered
4. **Policy Requirements**: Numbered, auditable mandates
5. **Compliance**: Violation consequences and exception process

#### API Endpoint
```
POST /.netlify/functions/generate-ai-policy
```
**Payload**:
```json
{
  "control_id": "AC-001",
  "company_name": "LYDELL SECURITY",
  "framework_context": {
    "controlTitle": "...",
    "controlDescription": "...",
    "riskLevel": "high",
    "frameworks": [...],
    "guidance": "...",
    "evidenceExamples": [...]
  },
  "stream": true
}
```

---

## Incident Response Module

### Location: `src/hooks/useIncidentResponse.ts`, `src/components/IncidentDashboard.tsx`, `src/components/IncidentDetail.tsx`

### Incident Structure
```typescript
interface Incident {
  id: string;           // Format: "IR-YYYY-XXXX"
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: IncidentCategory;
  affectedSystems: string[];
  detectedAt: string;
  reportedBy: string;
  assignedTo: string | null;
  timeline: TimelineEvent[];
  containmentActions: string[];
  rootCause: string | null;
  lessonsLearned: string | null;
  relatedControls: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}
```

### Incident Categories
- Data Breach
- Malware
- Phishing
- Unauthorized Access
- System Outage
- Policy Violation
- Physical Security
- Other

### Dashboard Features
1. **Statistics Cards**:
   - Active incidents count
   - Average resolution time
   - Incidents by severity
2. **Incident List**: Sortable, filterable table
3. **Quick Actions**: Create new incident button

### Incident Detail Features
1. **Status Management**: Workflow progression
2. **Timeline**: Chronological event log
3. **Related Controls**: Link to compliance controls
4. **Containment Actions**: Checklist of response steps
5. **Root Cause Analysis**: Documentation field
6. **Lessons Learned**: Post-incident review

### Risk Assessment Integration
- Automatic linking to affected compliance domains
- Impact scoring based on affected systems
- Compliance gap identification

---

## Reporting & Analytics

### Location: `src/components/ClientReporting.tsx`, `netlify/functions/generate-report.js`

### Report Types

#### 1. Executive Summary PDF
Generated client-side with print dialog:
- Framework compliance percentages
- Assessment statistics
- Critical gaps list
- Professional formatting

#### 2. Comprehensive PDF Report
Generated server-side via Netlify Function:

**Sections**:
1. Cover page with organization branding
2. Executive summary
3. Framework-by-framework analysis
4. Control assessment details
5. Gap analysis with remediation priorities
6. Evidence summary
7. Appendices

**Features**:
- Digital signature support
- Document hash for verification
- Rate limiting (10 requests/minute)
- JWT authentication

### API Endpoint
```
POST /.netlify/functions/generate-report
Authorization: Bearer <supabase_access_token>
```

---

## Trust Center

### Location: `src/components/TrustCenter.tsx`

### Purpose
Public-facing, read-only dashboard for external stakeholders (customers, auditors, partners).

### Displayed Information
1. **Organization Badge**: Company name and shield icon
2. **Overall Compliance Score**: Aggregate percentage
3. **Framework Compliance Cards**: Individual framework progress with:
   - Percentage gauge
   - Controls completed/total
   - Status badge (Excellent/Good/Moderate/In Progress)
   - Last updated timestamp
4. **Security Commitments**:
   - Data Encryption (AES-256, TLS 1.3)
   - Access Controls (RBAC, MFA)
   - Regular Audits (annual third-party)
   - Data Residency (SOC 2 compliant DCs)
   - Continuous Monitoring (24/7)
   - Vendor Management

### Contact Section
- Security team email link
- Professional call-to-action button

---

## Certificate Generation

### Location: `src/components/CertificateGenerator.tsx`

### Certificate Features
1. **Visual Design**:
   - Corporate branding
   - Holographic-style security elements
   - QR code for verification
2. **Certificate Data**:
   - Organization name
   - Compliance frameworks assessed
   - Overall score
   - Issue date
   - Unique certificate ID
3. **Digital Signature**:
   - SHA-256 document hash
   - Timestamp
4. **Download Options**:
   - PDF export
   - Print-ready format

### Audit Bundle
**Location**: `src/components/AuditBundle.tsx`

Comprehensive export package including:
- All evidence records
- Policy documents
- Assessment responses
- Framework mappings
- Audit trail

---

## Auditor Verification

### Location: `src/components/AuditorVerification.tsx`

### Purpose
Allow external auditors to verify certificate authenticity.

### Verification Methods
1. **Certificate ID Lookup**: Enter unique ID to retrieve certificate
2. **QR Code Scan**: Mobile verification via camera
3. **Document Hash**: Verify document integrity

### Verification Response
- Certificate validity status
- Issue date and expiration
- Compliance scores at time of issue
- Organization details

---

## Custom Controls

### Location: `src/App.tsx` - CompanyTab component

### Purpose
Allow organizations to add company-specific compliance requirements beyond standard frameworks.

### Custom Control Structure
```typescript
interface CustomControl {
  id: string;           // Format: "CTRL-XXXXXXXX"
  title: string;
  description: string;
  question: string;
  category: string;     // Always "company_specific"
  frameworkMappings: FrameworkMappingRecord[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  isActive: boolean;
}
```

### Features
1. **Create Modal**:
   - Control name (required)
   - Description (required)
   - Assessment question (auto-generated if blank)
   - Risk level selection
   - Framework mapping (optional)
2. **Framework Mapping**:
   - Select applicable frameworks
   - Enter specific clause IDs
3. **Management**:
   - View all custom controls
   - Delete (soft delete for audit trail)
4. **Integration**:
   - Custom controls appear in Assessment tab
   - Contribute to overall compliance scores

---

## Data Persistence

### Location: `src/hooks/useCompliance.ts`, `src/services/compliance-database.service.ts`

### Dual Persistence Strategy

#### localStorage (Offline-First)
- Immediate writes for responsiveness
- Works without internet connection
- Storage keys:
  - `ce4-responses`: Control answers
  - `ce4-evidence`: Evidence records
  - `ce4-custom-controls`: Custom controls
  - `ce4-dark-mode`: Theme preference
  - `ce4-last-synced`: Sync timestamp

#### Supabase (Cloud Sync)
- Background synchronization when online
- User authentication via Supabase Auth
- Multi-tenant support via `organization_id`
- Real-time sync notifications

### Database Tables
1. `user_responses`: Control assessments
2. `evidence_records`: Evidence documentation
3. `custom_controls`: Organization-specific controls
4. `sync_notifications`: Framework sync events
5. `master_controls`: Standard control library

### Sync Logic
```
1. User makes change → Write to localStorage immediately
2. If online + authenticated → Background sync to Supabase
3. On page load → Load from Supabase, merge with local (local wins for conflicts)
4. Conflict resolution → Newer timestamp takes precedence
```

---

## Theme System

### Location: `src/components/ThemeToggle.tsx`, `src/index.css`

### Available Themes

#### Dark Mode (Default) - "Midnight & Steel"
- Background: Deep slate/midnight blue
- Cards: Steel gray with subtle borders
- Accent: Indigo/violet (#6366f1)
- Text: Light steel grays

#### Light Mode - "Corporate"
- Background: Clean white/light gray
- Cards: White with subtle shadows
- Accent: Same indigo (#6366f1)
- Text: Dark slate

### Implementation
- CSS custom properties for colors
- Tailwind `dark:` variant classes
- Persisted to localStorage
- System preference detection

### CSS Variables
```css
:root {
  --color-midnight-900: #0f172a;
  --color-steel-800: #1e293b;
  --color-accent-500: #6366f1;
  /* ... */
}
```

---

## API & Backend Services

### Netlify Functions

#### 1. generate-ai-policy.js
- **Purpose**: AI-powered policy document generation
- **Method**: POST
- **Auth**: None (API key server-side)
- **Rate Limit**: Anthropic API limits apply

#### 2. generate-report.js
- **Purpose**: Comprehensive PDF report generation
- **Method**: POST
- **Auth**: JWT (Supabase access token)
- **Rate Limit**: 10 requests/minute per user

#### 3. save-policy-evidence.js
- **Purpose**: Save generated policies as evidence
- **Method**: POST
- **Auth**: JWT (Supabase access token)
- **Storage**: Supabase Storage bucket

### Environment Variables
```
ANTHROPIC_API_KEY=<claude-api-key>
SUPABASE_URL=<project-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

### Error Handling
- 400: Validation errors
- 401: Invalid/missing authentication
- 429: Rate limit exceeded
- 500: Server errors

---

## Security Features

### Authentication
- Supabase Auth (email/password, OAuth)
- JWT token validation
- Session management

### Authorization
- Organization-based access control
- User role metadata
- Row-level security in Supabase

### Data Protection
- TLS encryption in transit
- Supabase encryption at rest
- No sensitive data in localStorage
- Input sanitization

### Audit Trail
- Timestamps on all records
- User attribution (`answeredBy`, `createdBy`)
- Soft deletes for custom controls
- Sync notification history

---

## File Structure

```
ComplianceDashboard/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── index.css                  # Global styles & theme
│   ├── components/
│   │   ├── AIPolicyGenerator.tsx  # AI policy generation UI
│   │   ├── AuditBundle.tsx        # Audit export package
│   │   ├── AuditorVerification.tsx# Certificate verification
│   │   ├── CertificateGenerator.tsx# Compliance certificates
│   │   ├── ClientReporting.tsx    # Report generation UI
│   │   ├── IncidentDashboard.tsx  # IR overview
│   │   ├── IncidentDetail.tsx     # IR detail view
│   │   ├── PolicyGenerator.tsx    # Template policy generation
│   │   ├── RemediationEngine.tsx  # Gap remediation guidance
│   │   ├── ThemeToggle.tsx        # Dark/light mode switch
│   │   └── TrustCenter.tsx        # Public compliance view
│   ├── constants/
│   │   └── controls.ts            # Master control library
│   ├── hooks/
│   │   ├── useAuth.ts             # Authentication hook
│   │   ├── useCompliance.ts       # Main compliance state
│   │   ├── useComplianceWithSupabase.ts # (Legacy)
│   │   ├── useIncidentResponse.ts # IR state management
│   │   └── useReportGeneration.ts # Report API integration
│   ├── lib/
│   │   └── supabase.ts            # Supabase client
│   ├── services/
│   │   └── compliance-database.service.ts # DB operations
│   └── types/
│       └── incident.types.ts      # TypeScript interfaces
├── netlify/
│   └── functions/
│       ├── generate-ai-policy.js  # AI policy API
│       ├── generate-report.js     # PDF report API
│       └── save-policy-evidence.js# Evidence storage API
├── public/
└── dist/                          # Build output
```

---

## Performance Considerations

### Optimizations
1. **Memoization**: `useMemo` for computed values (stats, progress)
2. **Callbacks**: `useCallback` for event handlers
3. **Lazy Loading**: Potential for route-based code splitting
4. **Debouncing**: Auto-save with 300-500ms delay
5. **Background Sync**: Non-blocking Supabase operations

### Bundle Size
- Main bundle: ~1MB (uncompressed)
- Gzipped: ~257KB
- Recommendation: Consider code splitting for large components

---

## Future Enhancements

### Planned Features
1. **Real-time Collaboration**: Multi-user simultaneous editing
2. **Workflow Automation**: Approval workflows for evidence
3. **API Integrations**: Connect to ticketing systems (Jira, ServiceNow)
4. **Advanced Analytics**: Trend analysis, predictive compliance
5. **Mobile App**: Native iOS/Android applications
6. **SSO Integration**: SAML, OIDC providers

### Technical Debt
1. Incident Response localStorage → Supabase migration
2. Code splitting implementation
3. Unit test coverage
4. E2E testing with Playwright/Cypress

---

## Support & Contact

For questions about security practices:
- Email: security@lydellsecurity.com

For technical issues:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
