/**
 * ============================================================================
 * EXTENDED REMEDIATION GUIDANCE
 * ============================================================================
 *
 * Additional remediation guidance for controls not covered in main file.
 * Organized by domain for maintainability.
 */

import type { RemediationGuidance } from './remediations';

// ============================================================================
// SECURITY OPERATIONS REMEDIATIONS
// ============================================================================

const SECURITY_OPS_REMEDIATIONS: Record<string, RemediationGuidance> = {
  'SO-001': {
    controlId: 'SO-001',
    strategy: {
      principle: 'Centralized Security Monitoring',
      description: 'Aggregate security logs and events from all sources into a centralized SIEM for real-time monitoring and threat detection.',
      keyObjectives: [
        'Collect logs from all critical systems',
        'Implement real-time alerting',
        'Correlate events across sources',
        'Enable threat detection and hunting'
      ],
      securityFramework: 'NIST SP 800-137 - Continuous Monitoring'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Security Monitoring',
        steps: [
          'Enable CloudTrail in all regions',
          'Configure VPC Flow Logs',
          'Set up Security Hub',
          'Integrate with SIEM'
        ],
        commands: [
          '# Enable CloudTrail organization trail\naws cloudtrail create-trail --name org-trail --s3-bucket-name trail-bucket --is-organization-trail --is-multi-region-trail',
          '# Enable VPC Flow Logs\naws ec2 create-flow-logs --resource-type VPC --resource-ids vpc-xxx --traffic-type ALL --log-destination-type cloud-watch-logs',
          '# Enable Security Hub\naws securityhub enable-security-hub --enable-default-standards'
        ],
        consoleSteps: [
          'Navigate to CloudTrail > Create trail',
          'Enable multi-region and organization trail',
          'Go to VPC > Flow Logs > Create',
          'Navigate to Security Hub > Enable'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Security Monitoring',
        steps: [
          'Enable Microsoft Sentinel',
          'Configure data connectors',
          'Set up analytics rules',
          'Create workbooks for visibility'
        ],
        commands: [
          '# Enable Sentinel on workspace\naz sentinel onboarding create --resource-group RG --workspace-name WORKSPACE',
          '# Enable data connector\naz sentinel data-connector connect --resource-group RG --workspace-name WORKSPACE --data-connector-id CONNECTOR'
        ],
        consoleSteps: [
          'Navigate to Microsoft Sentinel',
          'Create or select workspace',
          'Configure data connectors',
          'Enable analytics rules'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Security Monitoring',
        steps: [
          'Enable Security Command Center',
          'Configure log exports',
          'Set up Chronicle SIEM',
          'Enable threat detection'
        ],
        commands: [
          '# Enable SCC\ngcloud scc organizations enable-asset-discovery --organization=ORG_ID',
          '# Create log sink\ngcloud logging sinks create security-logs bigquery.googleapis.com/projects/PROJECT/datasets/logs --log-filter="resource.type=gce_instance"'
        ],
        consoleSteps: [
          'Navigate to Security Command Center',
          'Enable premium tier for advanced features',
          'Configure finding notifications',
          'Set up Chronicle integration'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'screenshot',
          description: 'SIEM dashboard showing log sources',
          examples: ['Security Hub dashboard', 'Sentinel overview', 'SCC findings'],
          acceptanceCriteria: ['All critical systems feeding logs', 'Real-time data visible', 'Alerts configured']
        },
        {
          type: 'report',
          description: 'Log source inventory and coverage',
          examples: ['Data connector status', 'Log ingestion metrics'],
          acceptanceCriteria: ['100% coverage of critical systems', 'Logs retained per policy']
        }
      ],
      auditorNotes: 'Verify all critical log sources are integrated and alerts are functioning.',
      commonMistakes: ['Missing log sources', 'Alert fatigue from too many alerts', 'Not correlating events']
    },
    resources: [
      { title: 'AWS Security Hub', url: 'https://docs.aws.amazon.com/securityhub/' },
      { title: 'Microsoft Sentinel', url: 'https://docs.microsoft.com/en-us/azure/sentinel/' }
    ],
    estimatedEffort: 'high',
    automationPossible: true
  },

  'SO-002': {
    controlId: 'SO-002',
    strategy: {
      principle: 'Vulnerability Management',
      description: 'Implement continuous vulnerability scanning to identify and remediate security weaknesses before they can be exploited.',
      keyObjectives: [
        'Scan all systems regularly',
        'Prioritize by risk and exploitability',
        'Track remediation progress',
        'Verify fixes are effective'
      ],
      securityFramework: 'NIST SP 800-40 - Patch Management'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Vulnerability Scanning',
        steps: [
          'Enable Amazon Inspector',
          'Configure scan schedules',
          'Integrate with Security Hub',
          'Set up remediation workflows'
        ],
        commands: [
          '# Enable Inspector\naws inspector2 enable --resource-types EC2 ECR LAMBDA',
          '# Get findings\naws inspector2 list-findings --filter-criteria severity={comparison=EQUALS,value=CRITICAL}'
        ],
        consoleSteps: [
          'Navigate to Amazon Inspector',
          'Enable Inspector',
          'Configure coverage for EC2, ECR, Lambda',
          'Review findings dashboard'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Vulnerability Assessment',
        steps: [
          'Enable Defender for Cloud',
          'Configure vulnerability assessment',
          'Review secure score',
          'Track remediation'
        ],
        commands: [
          '# Enable Defender\naz security auto-provisioning-setting update --name default --auto-provision On',
          '# Get recommendations\naz security assessment list --query "[?status.code==\'Unhealthy\']"'
        ],
        consoleSteps: [
          'Navigate to Microsoft Defender for Cloud',
          'Enable Defender plans',
          'Review Secure Score',
          'Address recommendations'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Vulnerability Scanning',
        steps: [
          'Enable Security Command Center',
          'Configure Web Security Scanner',
          'Enable Container Analysis',
          'Review vulnerability findings'
        ],
        commands: [
          '# Enable Container Analysis\ngcloud services enable containeranalysis.googleapis.com',
          '# List vulnerabilities\ngcloud artifacts docker images list-vulnerabilities LOCATION-docker.pkg.dev/PROJECT/REPO/IMAGE'
        ],
        consoleSteps: [
          'Navigate to Security Command Center',
          'Enable vulnerability scanning',
          'Configure Web Security Scanner for apps',
          'Review findings'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'report',
          description: 'Vulnerability scan results',
          examples: ['Inspector findings', 'Defender recommendations', 'SCC vulnerabilities'],
          acceptanceCriteria: ['Scans run weekly or more', 'Critical vulns remediated in SLA', 'Trending improvement']
        },
        {
          type: 'screenshot',
          description: 'Vulnerability management dashboard',
          examples: ['Finding trends over time', 'Remediation tracking'],
          acceptanceCriteria: ['Shows scan coverage', 'Displays remediation progress']
        }
      ],
      auditorNotes: 'Review scan frequency and remediation SLAs. Sample critical findings for remediation evidence.',
      commonMistakes: ['Not scanning all assets', 'Ignoring informational findings', 'Not tracking remediation']
    },
    resources: [
      { title: 'Amazon Inspector', url: 'https://docs.aws.amazon.com/inspector/' },
      { title: 'Defender for Cloud', url: 'https://docs.microsoft.com/en-us/azure/defender-for-cloud/' }
    ],
    estimatedEffort: 'medium',
    automationPossible: true
  },

  'SO-003': {
    controlId: 'SO-003',
    strategy: {
      principle: 'Malware Protection',
      description: 'Deploy anti-malware solutions across all endpoints and servers to prevent, detect, and respond to malicious software.',
      keyObjectives: [
        'Deploy agents to all endpoints',
        'Enable real-time protection',
        'Keep signatures current',
        'Monitor for malware events'
      ],
      securityFramework: 'NIST SP 800-83 - Malware Prevention'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Malware Protection',
        steps: [
          'Enable GuardDuty Malware Protection',
          'Configure S3 malware scanning',
          'Deploy endpoint protection (third-party)',
          'Set up alerting'
        ],
        commands: [
          '# Enable GuardDuty\naws guardduty create-detector --enable --features Name=S3_DATA_EVENTS,Status=ENABLED Name=MALWARE_PROTECTION,Status=ENABLED',
          '# List detectors\naws guardduty list-detectors'
        ],
        consoleSteps: [
          'Navigate to GuardDuty',
          'Enable detector',
          'Enable Malware Protection feature',
          'Configure S3 malware scanning'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Malware Protection',
        steps: [
          'Enable Microsoft Defender for Endpoint',
          'Configure antivirus policies',
          'Enable cloud-delivered protection',
          'Set up automated remediation'
        ],
        commands: [
          '# Enable Defender via Intune\n# Use Microsoft Endpoint Manager portal',
          '# Check Defender status via PowerShell\nGet-MpComputerStatus'
        ],
        consoleSteps: [
          'Navigate to Endpoint Manager > Endpoint security',
          'Create antivirus policy',
          'Enable real-time protection',
          'Deploy to device groups'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Malware Protection',
        steps: [
          'Deploy third-party endpoint protection',
          'Enable Container Threat Detection',
          'Configure Virus Total integration',
          'Set up Security Command Center alerts'
        ],
        commands: [
          '# Enable Container Threat Detection\ngcloud scc findings list --organization=ORG_ID --source=SCC_SOURCE_ID --filter="category=\\"MALWARE\\""'
        ],
        consoleSteps: [
          'Deploy CrowdStrike, SentinelOne, or other EDR',
          'Configure in Security Command Center',
          'Enable threat detection',
          'Set up alerting'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'screenshot',
          description: 'Endpoint protection deployment status',
          examples: ['Agent deployment dashboard', 'Coverage metrics'],
          acceptanceCriteria: ['100% endpoint coverage', 'Real-time protection enabled', 'Signatures current']
        },
        {
          type: 'report',
          description: 'Malware detection and response report',
          examples: ['Detection events', 'Quarantine actions', 'Remediation status'],
          acceptanceCriteria: ['No unresolved malware events', 'Response within SLA']
        }
      ],
      auditorNotes: 'Verify all endpoints have protection and signatures are updated within 24 hours.',
      commonMistakes: ['Not covering all endpoints', 'Disabled real-time protection', 'Outdated signatures']
    },
    resources: [
      { title: 'GuardDuty Malware Protection', url: 'https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection.html' }
    ],
    estimatedEffort: 'medium',
    automationPossible: true
  }
};

// ============================================================================
// INCIDENT RESPONSE REMEDIATIONS
// ============================================================================

const INCIDENT_RESPONSE_REMEDIATIONS: Record<string, RemediationGuidance> = {
  'IR-001': {
    controlId: 'IR-001',
    strategy: {
      principle: 'Incident Response Planning',
      description: 'Develop and maintain a comprehensive incident response plan that defines roles, procedures, and communication protocols.',
      keyObjectives: [
        'Define incident classifications',
        'Establish response team and roles',
        'Document response procedures',
        'Define escalation paths'
      ],
      securityFramework: 'NIST SP 800-61 - Incident Handling Guide'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Incident Response Setup',
        steps: [
          'Configure AWS Organizations for centralized response',
          'Set up incident response accounts',
          'Deploy forensic workstations',
          'Configure automated response runbooks'
        ],
        commands: [
          '# Create incident response runbook\naws ssm create-document --name "IncidentResponse-IsolateInstance" --document-type "Automation" --content file://runbook.json',
          '# Set up EventBridge rule for auto-response\naws events put-rule --name "SecurityIncidentRule" --event-pattern file://pattern.json'
        ],
        consoleSteps: [
          'Create dedicated security/IR account',
          'Set up Systems Manager runbooks',
          'Configure EventBridge for automated response',
          'Document procedures in Confluence/Wiki'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Incident Response Setup',
        steps: [
          'Configure Sentinel playbooks',
          'Set up Logic Apps for automation',
          'Define incident workflows',
          'Configure notification channels'
        ],
        commands: [
          '# Create Sentinel playbook\naz sentinel automation-rule create --resource-group RG --workspace-name WS --automation-rule-name IR-Playbook'
        ],
        consoleSteps: [
          'Navigate to Sentinel > Automation',
          'Create playbooks for common incidents',
          'Configure automation rules',
          'Set up notification connectors'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Incident Response Setup',
        steps: [
          'Configure Cloud Functions for automation',
          'Set up Pub/Sub for alerting',
          'Deploy Chronicle for investigation',
          'Document runbooks'
        ],
        commands: [
          '# Create Pub/Sub topic for incidents\ngcloud pubsub topics create security-incidents',
          '# Deploy response function\ngcloud functions deploy incident-responder --trigger-topic=security-incidents'
        ],
        consoleSteps: [
          'Set up Cloud Functions for response',
          'Configure SCC notifications',
          'Document procedures',
          'Test response workflows'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'document',
          description: 'Incident response plan',
          examples: ['IR policy document', 'Runbook library', 'Contact lists'],
          acceptanceCriteria: ['Covers all incident types', 'Reviewed annually', 'Roles defined']
        },
        {
          type: 'report',
          description: 'IR plan testing results',
          examples: ['Tabletop exercise results', 'Drill documentation'],
          acceptanceCriteria: ['Tested within last year', 'Findings addressed', 'Improvements implemented']
        }
      ],
      auditorNotes: 'Request evidence of IR plan testing and any actual incident handling records.',
      commonMistakes: ['Plan not tested', 'Outdated contact info', 'Missing escalation paths']
    },
    resources: [
      { title: 'NIST Incident Response', url: 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final' }
    ],
    estimatedEffort: 'high',
    automationPossible: true
  },

  'IR-002': {
    controlId: 'IR-002',
    strategy: {
      principle: 'Security Event Detection',
      description: 'Implement detection capabilities to identify security events in real-time through automated alerting and monitoring.',
      keyObjectives: [
        'Define detection rules',
        'Minimize false positives',
        'Enable real-time alerting',
        'Correlate related events'
      ],
      securityFramework: 'MITRE ATT&CK Detection Framework'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Detection Setup',
        steps: [
          'Enable GuardDuty for threat detection',
          'Configure CloudWatch alarms',
          'Set up EventBridge rules',
          'Integrate with SIEM'
        ],
        commands: [
          '# Create GuardDuty detector\naws guardduty create-detector --enable',
          '# Create CloudWatch alarm\naws cloudwatch put-metric-alarm --alarm-name "UnauthorizedAPICalls" --metric-name UnauthorizedAttemptCount'
        ],
        consoleSteps: [
          'Enable GuardDuty in all regions',
          'Configure finding notifications',
          'Create CloudWatch alarms for key metrics',
          'Set up SNS for alerting'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Detection Setup',
        steps: [
          'Configure Sentinel analytics rules',
          'Enable Microsoft 365 Defender',
          'Set up fusion detection',
          'Configure alert grouping'
        ],
        commands: [
          '# Create analytics rule\naz sentinel alert-rule create --resource-group RG --workspace-name WS --rule-name "BruteForceDetection"'
        ],
        consoleSteps: [
          'Navigate to Sentinel > Analytics',
          'Enable built-in rules',
          'Create custom detection rules',
          'Configure incident creation'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Detection Setup',
        steps: [
          'Enable SCC threat detection',
          'Configure Cloud Logging alerts',
          'Set up Chronicle detection rules',
          'Enable Event Threat Detection'
        ],
        commands: [
          '# Create log-based alert\ngcloud alpha monitoring policies create --policy-from-file=alert-policy.json'
        ],
        consoleSteps: [
          'Enable Event Threat Detection in SCC',
          'Configure finding notifications',
          'Create custom detection rules',
          'Set up alerting'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'screenshot',
          description: 'Detection rules and alert configuration',
          examples: ['GuardDuty findings', 'Sentinel rules', 'SCC detectors'],
          acceptanceCriteria: ['Key threats covered', 'Alerts tested', 'Response integrated']
        },
        {
          type: 'report',
          description: 'Detection effectiveness metrics',
          examples: ['Alert volume trends', 'MTTD metrics', 'False positive rates'],
          acceptanceCriteria: ['Reasonable alert volume', 'Low false positive rate']
        }
      ],
      auditorNotes: 'Verify detection coverage against common attack patterns.',
      commonMistakes: ['Too many alerts causing fatigue', 'Missing critical detections', 'Not testing rules']
    },
    resources: [
      { title: 'GuardDuty', url: 'https://docs.aws.amazon.com/guardduty/' }
    ],
    estimatedEffort: 'medium',
    automationPossible: true
  }
};

// ============================================================================
// BUSINESS CONTINUITY REMEDIATIONS
// ============================================================================

const BUSINESS_CONTINUITY_REMEDIATIONS: Record<string, RemediationGuidance> = {
  'BC-001': {
    controlId: 'BC-001',
    strategy: {
      principle: 'Data Backup and Recovery',
      description: 'Implement comprehensive backup strategies to ensure data can be recovered in case of loss, corruption, or disaster.',
      keyObjectives: [
        'Backup all critical data',
        'Test recovery procedures',
        'Meet RPO and RTO requirements',
        'Secure backup data'
      ],
      securityFramework: 'ISO 22301 Business Continuity'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Backup Configuration',
        steps: [
          'Configure AWS Backup',
          'Create backup plans',
          'Set retention policies',
          'Test restore procedures'
        ],
        commands: [
          '# Create backup vault\naws backup create-backup-vault --backup-vault-name production-vault',
          '# Create backup plan\naws backup create-backup-plan --backup-plan file://backup-plan.json',
          '# Start backup job\naws backup start-backup-job --backup-vault-name production-vault --resource-arn RESOURCE_ARN --iam-role-arn ROLE_ARN'
        ],
        consoleSteps: [
          'Navigate to AWS Backup',
          'Create backup vault',
          'Create backup plan with schedule',
          'Assign resources to plan',
          'Configure cross-region copy if needed'
        ],
        terraformExample: `resource "aws_backup_vault" "main" {
  name = "production-vault"
}

resource "aws_backup_plan" "daily" {
  name = "daily-backup-plan"
  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"
    lifecycle {
      delete_after = 35
    }
  }
}`
      },
      {
        provider: 'azure',
        title: 'Azure Backup Configuration',
        steps: [
          'Create Recovery Services vault',
          'Configure backup policies',
          'Enable Azure Backup for VMs',
          'Test restore operations'
        ],
        commands: [
          '# Create vault\naz backup vault create --name vault-name --resource-group RG --location eastus',
          '# Enable VM backup\naz backup protection enable-for-vm --resource-group RG --vault-name VAULT --vm VM --policy-name DefaultPolicy'
        ],
        consoleSteps: [
          'Navigate to Recovery Services vaults',
          'Create vault',
          'Configure backup policy',
          'Enable backup for resources'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Backup Configuration',
        steps: [
          'Configure snapshot schedules',
          'Enable Cloud SQL backups',
          'Set up Backup and DR service',
          'Test recovery'
        ],
        commands: [
          '# Create snapshot schedule\ngcloud compute resource-policies create snapshot-schedule daily-backup --region=us-central1 --start-time=04:00 --daily-schedule',
          '# Attach to disk\ngcloud compute disks add-resource-policies DISK --resource-policies=daily-backup --zone=us-central1-a'
        ],
        consoleSteps: [
          'Navigate to Compute Engine > Snapshots',
          'Create snapshot schedule',
          'Attach to disks',
          'For SQL: Enable automated backups'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'screenshot',
          description: 'Backup configuration and schedules',
          examples: ['AWS Backup plans', 'Recovery Services vault', 'Snapshot schedules'],
          acceptanceCriteria: ['All critical data covered', 'Appropriate retention', 'Encryption enabled']
        },
        {
          type: 'report',
          description: 'Backup job history and restore tests',
          examples: ['Successful backup logs', 'Restore test documentation'],
          acceptanceCriteria: ['Backups completing successfully', 'Restore tested quarterly', 'RTO/RPO met']
        }
      ],
      auditorNotes: 'Verify backup coverage and request evidence of recent restore testing.',
      commonMistakes: ['Not testing restores', 'Insufficient retention', 'Backups not encrypted', 'Missing critical systems']
    },
    resources: [
      { title: 'AWS Backup', url: 'https://docs.aws.amazon.com/aws-backup/' }
    ],
    estimatedEffort: 'medium',
    automationPossible: true
  },

  'BC-002': {
    controlId: 'BC-002',
    strategy: {
      principle: 'Disaster Recovery Planning',
      description: 'Establish disaster recovery capabilities to maintain business operations during major incidents or disasters.',
      keyObjectives: [
        'Define RTO/RPO targets',
        'Establish recovery procedures',
        'Configure multi-region deployment',
        'Test DR procedures annually'
      ],
      securityFramework: 'ISO 22301 Business Continuity'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Disaster Recovery',
        steps: [
          'Design multi-region architecture',
          'Configure cross-region replication',
          'Set up Route 53 failover',
          'Document and test runbooks'
        ],
        commands: [
          '# Enable S3 cross-region replication\naws s3api put-bucket-replication --bucket SOURCE --replication-configuration file://replication.json',
          '# Create Route 53 health check\naws route53 create-health-check --caller-reference $(date +%s) --health-check-config file://health-check.json'
        ],
        consoleSteps: [
          'Design DR architecture',
          'Configure cross-region replication',
          'Set up Route 53 health checks',
          'Create failover routing policies',
          'Document DR runbooks'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Disaster Recovery',
        steps: [
          'Configure Azure Site Recovery',
          'Set up geo-redundant storage',
          'Implement Traffic Manager',
          'Test failover'
        ],
        commands: [
          '# Enable Site Recovery\naz site-recovery policy create --name dr-policy --resource-group RG --vault-name VAULT',
          '# Enable replication for VM\naz site-recovery protected-item create --resource-group RG --vault-name VAULT --protection-container PC --name VM --policy-id POLICY_ID'
        ],
        consoleSteps: [
          'Create Recovery Services vault',
          'Enable Site Recovery',
          'Configure replication',
          'Set up recovery plans',
          'Test failover'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Disaster Recovery',
        steps: [
          'Design multi-region deployment',
          'Configure regional replication',
          'Set up global load balancing',
          'Test failover'
        ],
        commands: [
          '# Create instance in DR region\ngcloud compute instances create dr-instance --zone=us-west1-a --source-machine-image=production-image',
          '# Create global load balancer\ngcloud compute url-maps create web-map --default-service=web-backend-service'
        ],
        consoleSteps: [
          'Design multi-region architecture',
          'Deploy to DR region',
          'Configure Cloud DNS for failover',
          'Document and test procedures'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'document',
          description: 'Disaster recovery plan',
          examples: ['DR plan document', 'RTO/RPO definitions', 'Recovery runbooks'],
          acceptanceCriteria: ['RTO/RPO defined', 'Procedures documented', 'Roles assigned']
        },
        {
          type: 'report',
          description: 'DR test results',
          examples: ['Failover test documentation', 'Recovery time measurements'],
          acceptanceCriteria: ['Tested within last year', 'Met RTO/RPO targets', 'Issues remediated']
        }
      ],
      auditorNotes: 'Request DR test evidence and verify RTO/RPO targets are realistic.',
      commonMistakes: ['Not testing DR', 'Unrealistic RTO/RPO', 'Outdated runbooks', 'Missing dependencies']
    },
    resources: [
      { title: 'AWS DR Best Practices', url: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/' }
    ],
    estimatedEffort: 'high',
    automationPossible: true
  }
};

// ============================================================================
// VENDOR MANAGEMENT REMEDIATIONS
// ============================================================================

const VENDOR_MANAGEMENT_REMEDIATIONS: Record<string, RemediationGuidance> = {
  'VM-001': {
    controlId: 'VM-001',
    strategy: {
      principle: 'Third-Party Risk Assessment',
      description: 'Evaluate and manage security risks associated with third-party vendors and service providers.',
      keyObjectives: [
        'Assess vendor security posture',
        'Review vendor SOC reports',
        'Include security in contracts',
        'Monitor ongoing compliance'
      ],
      securityFramework: 'NIST SP 800-161 - Supply Chain Risk Management'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Vendor Management',
        steps: [
          'Review AWS compliance reports',
          'Evaluate shared responsibility',
          'Monitor AWS Health Dashboard',
          'Configure AWS Artifact access'
        ],
        commands: [
          '# Access AWS Artifact for compliance reports\n# Navigate to AWS Artifact in console',
          '# Check AWS Health events\naws health describe-events --filter eventTypeCategories=issue'
        ],
        consoleSteps: [
          'Navigate to AWS Artifact',
          'Download SOC 2 report',
          'Review shared responsibility model',
          'Document AWS as vendor'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Vendor Management',
        steps: [
          'Access Service Trust Portal',
          'Review Azure compliance offerings',
          'Evaluate Azure security baseline',
          'Monitor Service Health'
        ],
        commands: [
          '# Check Azure service health\naz monitor activity-log alert list',
          '# Access Service Trust Portal via browser'
        ],
        consoleSteps: [
          'Go to servicetrust.microsoft.com',
          'Download compliance reports',
          'Review Azure security documentation',
          'Document in vendor inventory'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Vendor Management',
        steps: [
          'Access Compliance Reports Manager',
          'Review GCP security documentation',
          'Evaluate shared responsibility',
          'Monitor service status'
        ],
        commands: [
          '# Access compliance reports via console\n# Navigate to Security > Compliance Reports Manager'
        ],
        consoleSteps: [
          'Navigate to Compliance Reports Manager',
          'Download SOC 2, ISO reports',
          'Review shared responsibility',
          'Document in vendor inventory'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'document',
          description: 'Vendor inventory and risk assessments',
          examples: ['Vendor list', 'Risk assessment forms', 'Due diligence records'],
          acceptanceCriteria: ['All vendors inventoried', 'Risk assessed', 'Reviews current']
        },
        {
          type: 'document',
          description: 'Vendor compliance evidence',
          examples: ['SOC 2 reports', 'Security questionnaires', 'Penetration test results'],
          acceptanceCriteria: ['Reports current', 'No critical findings unaddressed']
        }
      ],
      auditorNotes: 'Sample vendors and request security assessments and compliance evidence.',
      commonMistakes: ['Missing vendors from inventory', 'Not reviewing SOC reports', 'Outdated assessments']
    },
    resources: [
      { title: 'AWS Artifact', url: 'https://aws.amazon.com/artifact/' }
    ],
    estimatedEffort: 'medium',
    automationPossible: false
  },

  'VM-002': {
    controlId: 'VM-002',
    strategy: {
      principle: 'Vendor Contract Security Requirements',
      description: 'Include appropriate security requirements in vendor contracts to ensure third parties meet security standards.',
      keyObjectives: [
        'Define security requirements',
        'Include data protection clauses',
        'Require incident notification',
        'Maintain audit rights'
      ],
      securityFramework: 'ISO 27001 A.15.1 - Supplier Relationships'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Contract Considerations',
        steps: [
          'Review AWS Customer Agreement',
          'Configure AWS Organizations SCPs',
          'Enable AWS Config for compliance',
          'Document shared responsibility'
        ],
        commands: [
          '# Create SCP for vendor compliance\naws organizations create-policy --name "VendorCompliance" --type SERVICE_CONTROL_POLICY --content file://scp.json'
        ],
        consoleSteps: [
          'Review AWS Customer Agreement',
          'Understand shared responsibility',
          'Configure compliance controls',
          'Document contractual obligations'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Contract Considerations',
        steps: [
          'Review Microsoft Customer Agreement',
          'Configure Azure Policy for compliance',
          'Document data processing terms',
          'Understand Microsoft DPA'
        ],
        commands: [
          '# Assign compliance policy\naz policy assignment create --name "VendorCompliance" --policy POLICY_ID --scope SCOPE'
        ],
        consoleSteps: [
          'Review Microsoft agreements',
          'Configure compliance policies',
          'Document data processing addendum',
          'Track contractual requirements'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Contract Considerations',
        steps: [
          'Review GCP Terms of Service',
          'Configure Organization Policies',
          'Document data processing terms',
          'Understand shared responsibility'
        ],
        commands: [
          '# Set organization policy\ngcloud org-policies set-policy policy.yaml --organization=ORG_ID'
        ],
        consoleSteps: [
          'Review GCP agreements',
          'Configure organization policies',
          'Document processing terms',
          'Track requirements'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'document',
          description: 'Vendor contracts with security requirements',
          examples: ['DPA', 'Security addendum', 'NDA'],
          acceptanceCriteria: ['Security requirements included', 'Audit rights specified', 'Incident notification required']
        },
        {
          type: 'document',
          description: 'Contract review checklist',
          examples: ['Security review checklist', 'Legal review sign-off'],
          acceptanceCriteria: ['Security team reviewed', 'Required clauses present']
        }
      ],
      auditorNotes: 'Sample vendor contracts and verify security requirements are included.',
      commonMistakes: ['Missing security clauses', 'No audit rights', 'Weak data protection terms']
    },
    resources: [
      { title: 'AWS Customer Agreement', url: 'https://aws.amazon.com/agreement/' }
    ],
    estimatedEffort: 'low',
    automationPossible: false
  }
};

// ============================================================================
// COMPLIANCE MONITORING REMEDIATIONS
// ============================================================================

const COMPLIANCE_MONITORING_REMEDIATIONS: Record<string, RemediationGuidance> = {
  'MO-001': {
    controlId: 'MO-001',
    strategy: {
      principle: 'Continuous Compliance Monitoring',
      description: 'Implement automated compliance monitoring to continuously verify adherence to security policies and regulatory requirements.',
      keyObjectives: [
        'Automate compliance checks',
        'Monitor configuration drift',
        'Generate compliance reports',
        'Alert on violations'
      ],
      securityFramework: 'NIST SP 800-137 - Continuous Monitoring'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Compliance Monitoring',
        steps: [
          'Enable AWS Config',
          'Configure conformance packs',
          'Enable Security Hub',
          'Set up automated remediation'
        ],
        commands: [
          '# Enable AWS Config\naws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=ROLE_ARN',
          '# Deploy conformance pack\naws configservice put-conformance-pack --conformance-pack-name "SOC2-Pack" --template-body file://soc2-pack.yaml',
          '# Enable Security Hub standards\naws securityhub batch-enable-standards --standards-subscription-requests StandardsArn=arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0'
        ],
        consoleSteps: [
          'Navigate to AWS Config',
          'Enable recorder',
          'Deploy conformance packs (CIS, SOC 2)',
          'Enable Security Hub',
          'Enable standards (CIS, PCI DSS)'
        ],
        terraformExample: `resource "aws_config_conformance_pack" "soc2" {
  name = "SOC2-Operational-Best-Practices"
  template_body = file("soc2-conformance-pack.yaml")
}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0"
}`
      },
      {
        provider: 'azure',
        title: 'Azure Compliance Monitoring',
        steps: [
          'Enable Microsoft Defender for Cloud',
          'Configure regulatory compliance',
          'Set up Azure Policy',
          'Enable continuous export'
        ],
        commands: [
          '# Assign regulatory compliance initiative\naz policy assignment create --name "CIS-Azure" --policy-set-definition CIS_Azure_1.1.0 --scope /subscriptions/SUB_ID',
          '# Get compliance state\naz policy state summarize --policy-assignment CIS-Azure'
        ],
        consoleSteps: [
          'Navigate to Defender for Cloud',
          'Enable regulatory compliance',
          'Select standards (CIS, SOC 2, PCI DSS)',
          'Review compliance dashboard'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Compliance Monitoring',
        steps: [
          'Enable Security Command Center',
          'Configure compliance monitoring',
          'Set up organization policies',
          'Review compliance reports'
        ],
        commands: [
          '# Enable SCC\ngcloud scc organizations update ORG_ID --enable-asset-discovery',
          '# List compliance findings\ngcloud scc findings list --organization=ORG_ID --source=SCC_SOURCE'
        ],
        consoleSteps: [
          'Enable Security Command Center premium',
          'Review compliance dashboard',
          'Configure finding notifications',
          'Export compliance reports'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'screenshot',
          description: 'Compliance dashboard showing current status',
          examples: ['Security Hub dashboard', 'Defender compliance', 'SCC compliance'],
          acceptanceCriteria: ['Standards enabled', 'Compliance score visible', 'Findings tracked']
        },
        {
          type: 'report',
          description: 'Compliance findings and remediation',
          examples: ['Security Hub findings', 'Policy compliance report'],
          acceptanceCriteria: ['Critical findings addressed', 'Trending improvement', 'Regular reviews']
        }
      ],
      auditorNotes: 'Verify continuous monitoring is active and findings are being addressed.',
      commonMistakes: ['Not enabling all relevant standards', 'Ignoring findings', 'Not tracking remediation']
    },
    resources: [
      { title: 'AWS Security Hub', url: 'https://docs.aws.amazon.com/securityhub/' }
    ],
    estimatedEffort: 'medium',
    automationPossible: true
  },

  'MO-002': {
    controlId: 'MO-002',
    strategy: {
      principle: 'Internal Audit Program',
      description: 'Establish an internal audit program to periodically assess the effectiveness of security controls.',
      keyObjectives: [
        'Define audit schedule',
        'Conduct control testing',
        'Track findings and remediation',
        'Report to management'
      ],
      securityFramework: 'ISO 27001 Clause 9.2 - Internal Audit'
    },
    implementations: [
      {
        provider: 'aws',
        title: 'AWS Internal Audit Support',
        steps: [
          'Use AWS Audit Manager',
          'Configure assessment frameworks',
          'Collect automated evidence',
          'Generate audit reports'
        ],
        commands: [
          '# Create Audit Manager assessment\naws auditmanager create-assessment --name "SOC2-Assessment" --framework-id FRAMEWORK_ID --scope file://scope.json',
          '# List assessments\naws auditmanager list-assessments'
        ],
        consoleSteps: [
          'Navigate to AWS Audit Manager',
          'Create assessment from framework',
          'Configure evidence collection',
          'Generate reports'
        ]
      },
      {
        provider: 'azure',
        title: 'Azure Internal Audit Support',
        steps: [
          'Use Microsoft Purview Compliance Manager',
          'Configure assessments',
          'Track improvement actions',
          'Generate compliance reports'
        ],
        commands: [
          '# Access via Microsoft Purview Compliance Portal\n# Configure assessments and track actions'
        ],
        consoleSteps: [
          'Navigate to Purview Compliance Manager',
          'Create assessments',
          'Track improvement actions',
          'Generate reports'
        ]
      },
      {
        provider: 'gcp',
        title: 'GCP Internal Audit Support',
        steps: [
          'Use Compliance Reports Manager',
          'Configure SCC for continuous audit',
          'Export evidence to storage',
          'Generate audit documentation'
        ],
        commands: [
          '# Export audit logs\ngcloud logging read "logName:cloudaudit.googleapis.com" --format=json > audit-logs.json'
        ],
        consoleSteps: [
          'Access Compliance Reports Manager',
          'Download compliance reports',
          'Review SCC findings',
          'Document audit evidence'
        ]
      }
    ],
    verification: {
      requirements: [
        {
          type: 'document',
          description: 'Internal audit schedule and results',
          examples: ['Audit plan', 'Audit reports', 'Finding tracker'],
          acceptanceCriteria: ['Annual audits conducted', 'Findings tracked', 'Remediation verified']
        },
        {
          type: 'report',
          description: 'Management review of audit findings',
          examples: ['Management meeting minutes', 'Audit committee reports'],
          acceptanceCriteria: ['Management informed', 'Resources allocated for remediation']
        }
      ],
      auditorNotes: 'Review internal audit reports and verify findings are being addressed.',
      commonMistakes: ['Infrequent audits', 'Not tracking remediation', 'Not reporting to management']
    },
    resources: [
      { title: 'AWS Audit Manager', url: 'https://docs.aws.amazon.com/audit-manager/' }
    ],
    estimatedEffort: 'high',
    automationPossible: true
  }
};

// ============================================================================
// EXPORT COMBINED REMEDIATIONS
// ============================================================================

export const EXTENDED_REMEDIATIONS: Record<string, RemediationGuidance> = {
  ...SECURITY_OPS_REMEDIATIONS,
  ...INCIDENT_RESPONSE_REMEDIATIONS,
  ...BUSINESS_CONTINUITY_REMEDIATIONS,
  ...VENDOR_MANAGEMENT_REMEDIATIONS,
  ...COMPLIANCE_MONITORING_REMEDIATIONS,
};

export default EXTENDED_REMEDIATIONS;
