/**
 * ISO 27001:2013 to 2022 Migration Script
 *
 * This script migrates all ISO 27001 control references from the 2013 format
 * (A.10.x, A.11.x, A.12.x, A.13.x, etc.) to the 2022 format (A.5.x - A.8.x)
 */

const fs = require('fs');
const path = require('path');

// ISO 27001:2013 to 2022 mapping
// The 2022 version consolidated 114 controls down to 93 and reorganized them
const ISO_MIGRATION_MAP = {
  // A.5 Information security policies (2013) -> A.5 Organizational controls (2022)
  'A.5.1.1': { id: 'A.5.1', title: 'Policies for information security' },
  'A.5.1.2': { id: 'A.5.1', title: 'Policies for information security' },

  // A.6 Organization of information security (2013) -> A.5 Organizational (2022)
  'A.6.1.1': { id: 'A.5.2', title: 'Information security roles and responsibilities' },
  'A.6.1.2': { id: 'A.5.3', title: 'Segregation of duties' },
  'A.6.1.3': { id: 'A.5.5', title: 'Contact with authorities' },
  'A.6.1.4': { id: 'A.5.6', title: 'Contact with special interest groups' },
  'A.6.1.5': { id: 'A.5.8', title: 'Information security in project management' },
  'A.6.2.1': { id: 'A.6.7', title: 'Remote working' },
  'A.6.2.2': { id: 'A.7.9', title: 'Security of assets off-premises' },

  // A.7 Human resource security (2013) -> A.6 People controls (2022)
  'A.7.1.1': { id: 'A.6.1', title: 'Screening' },
  'A.7.1.2': { id: 'A.6.2', title: 'Terms and conditions of employment' },
  'A.7.2.1': { id: 'A.6.3', title: 'Information security awareness, education and training' },
  'A.7.2.2': { id: 'A.6.4', title: 'Disciplinary process' },
  'A.7.2.3': { id: 'A.6.3', title: 'Information security awareness, education and training' },
  'A.7.3.1': { id: 'A.6.5', title: 'Responsibilities after termination or change of employment' },

  // A.8 Asset management (2013) -> A.5 Organizational (2022)
  'A.8.1.1': { id: 'A.5.9', title: 'Inventory of information and other associated assets' },
  'A.8.1.2': { id: 'A.5.9', title: 'Inventory of information and other associated assets' },
  'A.8.1.3': { id: 'A.5.10', title: 'Acceptable use of information and other associated assets' },
  'A.8.1.4': { id: 'A.5.11', title: 'Return of assets' },
  'A.8.2.1': { id: 'A.5.12', title: 'Classification of information' },
  'A.8.2.2': { id: 'A.5.13', title: 'Labelling of information' },
  'A.8.2.3': { id: 'A.5.10', title: 'Acceptable use of information and other associated assets' },
  'A.8.3.1': { id: 'A.7.10', title: 'Storage media' },
  'A.8.3.2': { id: 'A.7.10', title: 'Storage media' },
  'A.8.3.3': { id: 'A.5.14', title: 'Information transfer' },

  // A.9 Access control (2013) -> A.5 Organizational + A.8 Technological (2022)
  'A.9.1.1': { id: 'A.5.15', title: 'Access control' },
  'A.9.1.2': { id: 'A.5.15', title: 'Access control' },
  'A.9.2.1': { id: 'A.5.16', title: 'Identity management' },
  'A.9.2.2': { id: 'A.5.18', title: 'Access rights' },
  'A.9.2.3': { id: 'A.8.2', title: 'Privileged access rights' },
  'A.9.2.4': { id: 'A.5.17', title: 'Authentication information' },
  'A.9.2.5': { id: 'A.5.18', title: 'Access rights' },
  'A.9.2.6': { id: 'A.5.18', title: 'Access rights' },
  'A.9.3.1': { id: 'A.5.17', title: 'Authentication information' },
  'A.9.4.1': { id: 'A.8.3', title: 'Information access restriction' },
  'A.9.4.2': { id: 'A.8.5', title: 'Secure authentication' },
  'A.9.4.3': { id: 'A.5.17', title: 'Authentication information' },
  'A.9.4.4': { id: 'A.8.2', title: 'Privileged access rights' },
  'A.9.4.5': { id: 'A.8.4', title: 'Access to source code' },

  // A.10 Cryptography (2013) -> A.8 Technological (2022)
  'A.10.1.1': { id: 'A.8.24', title: 'Use of cryptography' },
  'A.10.1.2': { id: 'A.8.24', title: 'Use of cryptography' },

  // A.11 Physical and environmental security (2013) -> A.7 Physical (2022)
  'A.11.1.1': { id: 'A.7.1', title: 'Physical security perimeters' },
  'A.11.1.2': { id: 'A.7.2', title: 'Physical entry' },
  'A.11.1.3': { id: 'A.7.3', title: 'Securing offices, rooms and facilities' },
  'A.11.1.4': { id: 'A.7.5', title: 'Protecting against physical and environmental threats' },
  'A.11.1.5': { id: 'A.7.6', title: 'Working in secure areas' },
  'A.11.1.6': { id: 'A.7.2', title: 'Physical entry' },
  'A.11.2.1': { id: 'A.7.8', title: 'Equipment siting and protection' },
  'A.11.2.2': { id: 'A.7.11', title: 'Supporting utilities' },
  'A.11.2.3': { id: 'A.7.12', title: 'Cabling security' },
  'A.11.2.4': { id: 'A.7.13', title: 'Equipment maintenance' },
  'A.11.2.5': { id: 'A.7.9', title: 'Security of assets off-premises' },
  'A.11.2.6': { id: 'A.7.9', title: 'Security of assets off-premises' },
  'A.11.2.7': { id: 'A.7.14', title: 'Secure disposal or re-use of equipment' },
  'A.11.2.8': { id: 'A.8.1', title: 'User endpoint devices' },
  'A.11.2.9': { id: 'A.8.1', title: 'User endpoint devices' },

  // A.12 Operations security (2013) -> A.8 Technological (2022)
  'A.12.1.1': { id: 'A.5.37', title: 'Documented operating procedures' },
  'A.12.1.2': { id: 'A.8.32', title: 'Change management' },
  'A.12.1.3': { id: 'A.8.6', title: 'Capacity management' },
  'A.12.1.4': { id: 'A.8.31', title: 'Separation of development, test and production environments' },
  'A.12.2.1': { id: 'A.8.7', title: 'Protection against malware' },
  'A.12.3.1': { id: 'A.8.13', title: 'Information backup' },
  'A.12.4.1': { id: 'A.8.15', title: 'Logging' },
  'A.12.4.2': { id: 'A.8.15', title: 'Logging' },
  'A.12.4.3': { id: 'A.8.15', title: 'Logging' },
  'A.12.4.4': { id: 'A.8.17', title: 'Clock synchronization' },
  'A.12.5.1': { id: 'A.8.19', title: 'Installation of software on operational systems' },
  'A.12.6.1': { id: 'A.8.8', title: 'Management of technical vulnerabilities' },
  'A.12.6.2': { id: 'A.8.19', title: 'Installation of software on operational systems' },
  'A.12.7.1': { id: 'A.8.34', title: 'Protection of information systems during audit testing' },

  // A.13 Communications security (2013) -> A.8 Technological (2022)
  'A.13.1.1': { id: 'A.8.20', title: 'Networks security' },
  'A.13.1.2': { id: 'A.8.21', title: 'Security of network services' },
  'A.13.1.3': { id: 'A.8.22', title: 'Segregation of networks' },
  'A.13.2.1': { id: 'A.5.14', title: 'Information transfer' },
  'A.13.2.2': { id: 'A.5.14', title: 'Information transfer' },
  'A.13.2.3': { id: 'A.5.14', title: 'Information transfer' },
  'A.13.2.4': { id: 'A.6.6', title: 'Confidentiality or non-disclosure agreements' },

  // A.14 System acquisition, development and maintenance (2013) -> A.8 Technological (2022)
  'A.14.1.1': { id: 'A.5.8', title: 'Information security in project management' },
  'A.14.1.2': { id: 'A.8.26', title: 'Application security requirements' },
  'A.14.1.3': { id: 'A.8.26', title: 'Application security requirements' },
  'A.14.2.1': { id: 'A.8.25', title: 'Secure development life cycle' },
  'A.14.2.2': { id: 'A.8.32', title: 'Change management' },
  'A.14.2.3': { id: 'A.8.32', title: 'Change management' },
  'A.14.2.4': { id: 'A.8.32', title: 'Change management' },
  'A.14.2.5': { id: 'A.8.27', title: 'Secure system architecture and engineering principles' },
  'A.14.2.6': { id: 'A.8.30', title: 'Outsourced development' },
  'A.14.2.7': { id: 'A.8.30', title: 'Outsourced development' },
  'A.14.2.8': { id: 'A.8.29', title: 'Security testing in development and acceptance' },
  'A.14.2.9': { id: 'A.8.29', title: 'Security testing in development and acceptance' },
  'A.14.3.1': { id: 'A.8.33', title: 'Test information' },

  // A.15 Supplier relationships (2013) -> A.5 Organizational (2022)
  'A.15.1.1': { id: 'A.5.19', title: 'Information security in supplier relationships' },
  'A.15.1.2': { id: 'A.5.20', title: 'Addressing information security within supplier agreements' },
  'A.15.1.3': { id: 'A.5.21', title: 'Managing information security in the ICT supply chain' },
  'A.15.2.1': { id: 'A.5.22', title: 'Monitoring, review and change management of supplier services' },
  'A.15.2.2': { id: 'A.5.22', title: 'Monitoring, review and change management of supplier services' },

  // A.16 Information security incident management (2013) -> A.5 Organizational (2022)
  'A.16.1.1': { id: 'A.5.24', title: 'Information security incident management planning and preparation' },
  'A.16.1.2': { id: 'A.6.8', title: 'Information security event reporting' },
  'A.16.1.3': { id: 'A.6.8', title: 'Information security event reporting' },
  'A.16.1.4': { id: 'A.5.25', title: 'Assessment and decision on information security events' },
  'A.16.1.5': { id: 'A.5.26', title: 'Response to information security incidents' },
  'A.16.1.6': { id: 'A.5.27', title: 'Learning from information security incidents' },
  'A.16.1.7': { id: 'A.5.28', title: 'Collection of evidence' },

  // A.17 Business continuity (2013) -> A.5 Organizational (2022)
  'A.17.1.1': { id: 'A.5.29', title: 'Information security during disruption' },
  'A.17.1.2': { id: 'A.5.30', title: 'ICT readiness for business continuity' },
  'A.17.1.3': { id: 'A.5.30', title: 'ICT readiness for business continuity' },
  'A.17.2.1': { id: 'A.7.11', title: 'Supporting utilities' },

  // A.18 Compliance (2013) -> A.5 Organizational (2022)
  'A.18.1.1': { id: 'A.5.31', title: 'Identification of applicable legislation and contractual requirements' },
  'A.18.1.2': { id: 'A.5.32', title: 'Intellectual property rights' },
  'A.18.1.3': { id: 'A.5.33', title: 'Protection of records' },
  'A.18.1.4': { id: 'A.5.34', title: 'Privacy and protection of personal information' },
  'A.18.1.5': { id: 'A.8.24', title: 'Use of cryptography' },
  'A.18.2.1': { id: 'A.5.35', title: 'Independent review of information security' },
  'A.18.2.2': { id: 'A.5.36', title: 'Compliance with policies, rules and standards' },
  'A.18.2.3': { id: 'A.5.36', title: 'Compliance with policies, rules and standards' },
};

// Simplified mapping for clause IDs that don't have the full version
const SIMPLIFIED_MAP = {
  // A.12.x Operations -> A.8 Technological
  'A.12.2.1': { id: 'A.8.7', title: 'Protection against malware' },
  'A.12.4.1': { id: 'A.8.15', title: 'Logging' },
  'A.12.4.2': { id: 'A.8.15', title: 'Logging' },
  'A.12.4.3': { id: 'A.8.15', title: 'Logging' },
  'A.12.4.4': { id: 'A.8.17', title: 'Clock synchronization' },
  'A.12.5.1': { id: 'A.8.19', title: 'Installation of software on operational systems' },
  'A.12.6.1': { id: 'A.8.8', title: 'Management of technical vulnerabilities' },

  // A.13.x Communications -> A.8 Technological
  'A.13.1.1': { id: 'A.8.20', title: 'Networks security' },
  'A.13.1.2': { id: 'A.8.21', title: 'Security of network services' },
  'A.13.1.3': { id: 'A.8.22', title: 'Segregation of networks' },
  'A.13.2.1': { id: 'A.5.14', title: 'Information transfer' },
};

const controlsPath = path.join(__dirname, '../src/constants/controls.ts');

// Read the file
let content = fs.readFileSync(controlsPath, 'utf-8');

// Track changes
let changesCount = 0;

// Replace old ISO 27001 references with new ones
Object.entries({...ISO_MIGRATION_MAP, ...SIMPLIFIED_MAP}).forEach(([oldId, mapping]) => {
  const regex = new RegExp(
    `(\\{\\s*frameworkId:\\s*'ISO27001',\\s*clauseId:\\s*')${oldId.replace(/\./g, '\\.')}('\\s*,\\s*clauseTitle:\\s*')[^']*('\\s*\\})`,
    'g'
  );

  const newContent = content.replace(regex, (match, prefix, middle, suffix) => {
    changesCount++;
    return `${prefix}${mapping.id}${middle}${mapping.title}${suffix}`;
  });

  if (newContent !== content) {
    content = newContent;
  }
});

// Write the updated file
fs.writeFileSync(controlsPath, content, 'utf-8');

console.log(`ISO 27001 Migration Complete!`);
console.log(`Updated ${changesCount} control mappings to ISO 27001:2022 format`);
console.log('\nMigration Map Used:');
console.log('- A.12.x (Operations) -> A.8.x (Technological)');
console.log('- A.13.x (Communications) -> A.8.x (Technological)');
console.log('- Old Annex A structure (114 controls) -> New structure (93 controls)');
