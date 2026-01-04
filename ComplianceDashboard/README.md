# Compliance Readiness Dashboard

A multi-framework compliance assessment tool built by [Lydell Security](https://www.lydellsecurity.com).

![Dashboard Preview](https://img.shields.io/badge/Frameworks-SOC2%20%7C%20HIPAA%20%7C%20PCI--DSS%20%7C%20CMMC-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

## 🎯 Overview

Interactive compliance readiness assessment dashboard supporting four major security frameworks:

- **SOC 2 Type II** - Trust Services Criteria
- **HIPAA** - Privacy, Security, and Breach Notification Rules  
- **PCI-DSS 4.0** - Cardholder Data Environment Controls
- **CMMC 2.0** - NIST SP 800-171 Practices

## ✨ Features

### Cross-Mapping Engine
When you answer "Yes" to a control that exists across multiple frameworks (like MFA or encryption), the answer automatically syncs to all applicable frameworks—saving significant assessment time.

### Visual Analytics
- **Radar Chart** - Compare readiness across all four frameworks simultaneously
- **Progress Rings** - Track completion percentage per framework
- **Real-time Scoring** - Instant readiness calculations

### Role-Based Action Items
Remediation tasks automatically categorized by responsible team:
- 🖥️ **IT Team** - Technical controls and configurations
- 👥 **HR/Admin** - Training, policies, personnel security
- 💼 **Executive Leadership** - Governance and strategic decisions

### Policy Templates
Checklist of required documentation for each framework:
- Common templates (applicable across frameworks)
- Framework-specific documents

### Data Persistence
Assessment progress saves automatically to browser localStorage—users can return and continue where they left off.

## 🚀 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/compliance-dashboard)

**Or manually:**

1. Fork/clone this repository
2. Connect to Vercel
3. Deploy (zero configuration needed)

### Custom Domain Setup

1. In Vercel Dashboard: Settings → Domains
2. Add: `compliance.lydellsecurity.com`
3. Configure DNS CNAME record pointing to `cname.vercel-dns.com`

## 🔧 Local Development

No build step required—just open `index.html` in a browser:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/compliance-dashboard.git

# Open in browser
open index.html
# or
python -m http.server 8000
```

## 📁 Project Structure

```
compliance-dashboard/
├── index.html      # Complete standalone application
├── vercel.json     # Vercel deployment configuration
├── README.md       # This file
└── LICENSE         # License information
```

## 🛠️ Technology Stack

- **React 18** - UI framework (loaded via CDN)
- **Tailwind CSS** - Styling (loaded via CDN)
- **Lucide Icons** - Icon library
- **Babel** - JSX transformation (in-browser)

## 📊 Supported Controls

The cross-mapping engine synchronizes these control types across frameworks:

| Control | SOC 2 | HIPAA | PCI-DSS | CMMC |
|---------|-------|-------|---------|------|
| Multi-Factor Authentication | ✅ | ✅ | ✅ | ✅ |
| Encryption (Transit) | ✅ | ✅ | ✅ | ✅ |
| Encryption (Rest) | ✅ | ✅ | ✅ | ✅ |
| Access Control | ✅ | ✅ | ✅ | ✅ |
| Incident Response | ✅ | ✅ | ✅ | ✅ |
| Security Training | ✅ | ✅ | ✅ | ✅ |
| Vulnerability Management | ✅ | ✅ | ✅ | ✅ |
| Audit Logging | ✅ | ✅ | ✅ | ✅ |
| Change Management | ✅ | ❌ | ✅ | ✅ |
| Physical Security | ✅ | ✅ | ✅ | ✅ |

## 🎨 Customization

### Adding Questions

Edit the `FRAMEWORK_DATA` object in `index.html`:

```javascript
{
  id: 'unique_id',
  text: 'Your question text here?',
  mapping: CONTROL_MAPPINGS.MFA, // or null if not cross-mapped
  owner: 'IT', // or 'HR' or 'Executive'
  priority: 'high' // or 'medium'
}
```

### Changing Colors

Update the `color` property in each framework's configuration:

```javascript
SOC2: {
  color: '#3B82F6', // Change this hex value
  ...
}
```

## 📞 Support

**Lydell Security LLC**
- 🌐 Website: [lydellsecurity.com](https://www.lydellsecurity.com)
- 📧 Email: support@lydellsecurity.com
- 📱 Phone: 770-243-9064

## 📄 License

Proprietary - © 2026 Lydell Security LLC. All rights reserved.

---

<p align="center">
  <strong>Need help achieving compliance?</strong><br>
  <a href="https://www.lydellsecurity.com/contact">Schedule a consultation</a> with our expert team.
</p>
