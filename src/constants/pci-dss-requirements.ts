/**
 * PCI DSS v4.0 Complete Requirements
 * All ~300 sub-requirements at the x.x.x level
 */

export interface PCIRequirement {
  id: string;
  title: string;
  description?: string;
}

export interface PCISubRequirement {
  id: string;
  name: string;
  requirements: PCIRequirement[];
}

export interface PCIPrincipalRequirement {
  id: string;
  name: string;
  subRequirements: PCISubRequirement[];
}

export const PCI_DSS_V4_REQUIREMENTS: PCIPrincipalRequirement[] = [
  // Requirement 1: Install and Maintain Network Security Controls
  {
    id: '1',
    name: 'Install and Maintain Network Security Controls',
    subRequirements: [
      {
        id: '1.1',
        name: 'Processes and mechanisms for network security controls are defined and understood',
        requirements: [
          { id: '1.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known to all affected parties' },
          { id: '1.1.2', title: 'Roles and responsibilities for performing activities in Requirement 1 are documented, assigned, and understood' },
        ],
      },
      {
        id: '1.2',
        name: 'Network security controls are configured and maintained',
        requirements: [
          { id: '1.2.1', title: 'Configuration standards for NSC rulesets are defined, implemented, and maintained' },
          { id: '1.2.2', title: 'All changes to network connections and NSC configurations are approved and managed' },
          { id: '1.2.3', title: 'An accurate network diagram is maintained showing all connections between the CDE and other networks' },
          { id: '1.2.4', title: 'An accurate data-flow diagram is maintained showing all account data flows' },
          { id: '1.2.5', title: 'All services, protocols, and ports allowed are identified, approved, and have a defined business need' },
          { id: '1.2.6', title: 'Security features are defined and implemented for all services, protocols, and ports in use' },
          { id: '1.2.7', title: 'Configurations of NSCs are reviewed at least once every six months' },
          { id: '1.2.8', title: 'Configuration files for NSCs are secured from unauthorized access and kept consistent with active configurations' },
        ],
      },
      {
        id: '1.3',
        name: 'Network access to and from the CDE is restricted',
        requirements: [
          { id: '1.3.1', title: 'Inbound traffic to the CDE is restricted to only traffic that is necessary' },
          { id: '1.3.2', title: 'Outbound traffic from the CDE is restricted to only traffic that is necessary' },
          { id: '1.3.3', title: 'NSCs are installed between all wireless networks and the CDE' },
        ],
      },
      {
        id: '1.4',
        name: 'Network connections between trusted and untrusted networks are controlled',
        requirements: [
          { id: '1.4.1', title: 'NSCs are implemented between trusted and untrusted networks' },
          { id: '1.4.2', title: 'Inbound traffic from untrusted networks to trusted networks is restricted' },
          { id: '1.4.3', title: 'Anti-spoofing measures are implemented to detect and block forged source IP addresses' },
          { id: '1.4.4', title: 'System components that store cardholder data are not directly accessible from untrusted networks' },
          { id: '1.4.5', title: 'The disclosure of internal IP addresses and routing information is limited' },
        ],
      },
      {
        id: '1.5',
        name: 'Risks to the CDE from computing devices are mitigated',
        requirements: [
          { id: '1.5.1', title: 'Security controls are implemented on any computing devices that connect to both untrusted networks and the CDE' },
        ],
      },
    ],
  },
  // Requirement 2: Apply Secure Configurations
  {
    id: '2',
    name: 'Apply Secure Configurations to All System Components',
    subRequirements: [
      {
        id: '2.1',
        name: 'Processes and mechanisms for secure configurations are defined and understood',
        requirements: [
          { id: '2.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '2.1.2', title: 'Roles and responsibilities for performing activities in Requirement 2 are documented, assigned, and understood' },
        ],
      },
      {
        id: '2.2',
        name: 'System components are configured and managed securely',
        requirements: [
          { id: '2.2.1', title: 'Configuration standards are developed, implemented, and maintained for all system components' },
          { id: '2.2.2', title: 'Vendor default accounts are managed or disabled/removed before a system goes into production' },
          { id: '2.2.3', title: 'Primary functions requiring different security levels are managed separately' },
          { id: '2.2.4', title: 'Only necessary services, protocols, daemons, and functions are enabled' },
          { id: '2.2.5', title: 'If any insecure services, protocols, or daemons are present, they are justified and additional security features are implemented' },
          { id: '2.2.6', title: 'System security parameters are configured to prevent misuse' },
          { id: '2.2.7', title: 'All non-console administrative access is encrypted using strong cryptography' },
        ],
      },
      {
        id: '2.3',
        name: 'Wireless environments are configured and managed securely',
        requirements: [
          { id: '2.3.1', title: 'For wireless environments connected to the CDE, all wireless vendor defaults are changed at installation' },
          { id: '2.3.2', title: 'For wireless environments connected to the CDE, wireless encryption keys are changed when personnel with knowledge leave' },
        ],
      },
    ],
  },
  // Requirement 3: Protect Stored Account Data
  {
    id: '3',
    name: 'Protect Stored Account Data',
    subRequirements: [
      {
        id: '3.1',
        name: 'Processes and mechanisms for protecting stored account data are defined and understood',
        requirements: [
          { id: '3.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '3.1.2', title: 'Roles and responsibilities for performing activities in Requirement 3 are documented, assigned, and understood' },
        ],
      },
      {
        id: '3.2',
        name: 'Storage of account data is kept to a minimum',
        requirements: [
          { id: '3.2.1', title: 'Account data storage is kept to a minimum through data retention and disposal policies' },
        ],
      },
      {
        id: '3.3',
        name: 'Sensitive authentication data is not stored after authorization',
        requirements: [
          { id: '3.3.1', title: 'SAD is not retained after authorization, even if encrypted' },
          { id: '3.3.1.1', title: 'The full contents of any track are not retained upon completion of the authorization process' },
          { id: '3.3.1.2', title: 'The card verification code is not retained upon completion of the authorization process' },
          { id: '3.3.1.3', title: 'The PIN or PIN block is not retained upon completion of the authorization process' },
          { id: '3.3.2', title: 'SAD that is stored prior to completion of authorization is encrypted using strong cryptography' },
          { id: '3.3.3', title: 'Issuers storing SAD have a documented business justification and secure storage requirements' },
        ],
      },
      {
        id: '3.4',
        name: 'Access to displays of full PAN and ability to copy PAN is restricted',
        requirements: [
          { id: '3.4.1', title: 'PAN is masked when displayed, so only personnel with legitimate business need can see more than the first six/last four digits' },
          { id: '3.4.2', title: 'Technical controls prevent copying and/or relocation of PAN when using remote-access technologies' },
        ],
      },
      {
        id: '3.5',
        name: 'PAN is secured wherever it is stored',
        requirements: [
          { id: '3.5.1', title: 'PAN is rendered unreadable anywhere it is stored using one-way hashes, truncation, index tokens, or strong cryptography' },
          { id: '3.5.1.1', title: 'Hashes used to render PAN unreadable are keyed cryptographic hashes' },
          { id: '3.5.1.2', title: 'Disk-level or partition-level encryption is only used to render PAN unreadable on removable electronic media' },
          { id: '3.5.1.3', title: 'If disk-level or partition-level encryption is used, it is implemented with cryptographic architecture approved by the organization' },
        ],
      },
      {
        id: '3.6',
        name: 'Cryptographic keys used to protect stored account data are secured',
        requirements: [
          { id: '3.6.1', title: 'Procedures are defined and implemented to protect cryptographic keys' },
          { id: '3.6.1.1', title: 'Additional requirement for service providers: A documented description of the cryptographic architecture is maintained' },
          { id: '3.6.1.2', title: 'Secret and private keys used to encrypt/decrypt stored account data are stored securely' },
          { id: '3.6.1.3', title: 'Access to cleartext cryptographic key components is restricted to the fewest number of custodians necessary' },
          { id: '3.6.1.4', title: 'Cryptographic keys are stored in the fewest possible locations' },
        ],
      },
      {
        id: '3.7',
        name: 'Where cryptography is used to protect stored account data, key management processes are defined',
        requirements: [
          { id: '3.7.1', title: 'Key-management policies and procedures are implemented to include generation of strong cryptographic keys' },
          { id: '3.7.2', title: 'Key-management policies and procedures are implemented to include secure key distribution' },
          { id: '3.7.3', title: 'Key-management policies and procedures are implemented to include secure key storage' },
          { id: '3.7.4', title: 'Key-management policies and procedures are implemented to include key changes for keys that have reached the end of their cryptoperiod' },
          { id: '3.7.5', title: 'Key-management policies and procedures are implemented to include retirement or replacement of keys when integrity is weakened' },
          { id: '3.7.6', title: 'Key-management policies and procedures are implemented for manual clear-text key management with split knowledge and dual control' },
          { id: '3.7.7', title: 'Key-management policies and procedures are implemented to include prevention of unauthorized substitution of cryptographic keys' },
          { id: '3.7.8', title: 'Key-management policies and procedures are implemented to include cryptographic key custodians signing a form acknowledging responsibilities' },
          { id: '3.7.9', title: 'Additional requirement for service providers: Cryptographic architecture documentation includes details of all algorithms, protocols, and keys' },
        ],
      },
    ],
  },
  // Requirement 4: Protect Cardholder Data During Transmission
  {
    id: '4',
    name: 'Protect Cardholder Data with Strong Cryptography During Transmission Over Open, Public Networks',
    subRequirements: [
      {
        id: '4.1',
        name: 'Processes and mechanisms for protecting CHD with strong cryptography during transmission are defined',
        requirements: [
          { id: '4.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '4.1.2', title: 'Roles and responsibilities for performing activities in Requirement 4 are documented, assigned, and understood' },
        ],
      },
      {
        id: '4.2',
        name: 'PAN is protected with strong cryptography during transmission',
        requirements: [
          { id: '4.2.1', title: 'Strong cryptography and security protocols are implemented to safeguard PAN during transmission over open, public networks' },
          { id: '4.2.1.1', title: 'An inventory of trusted keys and certificates is maintained' },
          { id: '4.2.1.2', title: 'Wireless networks transmitting PAN or connected to the CDE use industry best practices to implement strong cryptography' },
          { id: '4.2.2', title: 'PAN is secured with strong cryptography whenever it is sent via end-user messaging technologies' },
        ],
      },
    ],
  },
  // Requirement 5: Protect All Systems from Malicious Software
  {
    id: '5',
    name: 'Protect All Systems and Networks from Malicious Software',
    subRequirements: [
      {
        id: '5.1',
        name: 'Processes and mechanisms for protecting from malicious software are defined and understood',
        requirements: [
          { id: '5.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '5.1.2', title: 'Roles and responsibilities for performing activities in Requirement 5 are documented, assigned, and understood' },
        ],
      },
      {
        id: '5.2',
        name: 'Malicious software is prevented, or detected and addressed',
        requirements: [
          { id: '5.2.1', title: 'An anti-malware solution is deployed on all system components, except those that are not commonly affected by malware' },
          { id: '5.2.2', title: 'The deployed anti-malware solution detects all known types of malware and removes, blocks, or contains all known types of malware' },
          { id: '5.2.3', title: 'Any system components that are not at risk for malware are evaluated periodically to confirm that they continue to not require anti-malware protection' },
          { id: '5.2.3.1', title: 'The frequency of periodic evaluations of system components not at risk for malware is defined in the targeted risk analysis' },
        ],
      },
      {
        id: '5.3',
        name: 'Anti-malware mechanisms and processes are active, maintained, and monitored',
        requirements: [
          { id: '5.3.1', title: 'The anti-malware solution is kept current via automatic updates' },
          { id: '5.3.2', title: 'The anti-malware solution performs periodic scans and active or real-time scans, OR performs continuous behavioral analysis' },
          { id: '5.3.2.1', title: 'If periodic malware scans are performed, the frequency of scans is defined in the targeted risk analysis' },
          { id: '5.3.3', title: 'For removable electronic media, the anti-malware solution performs automatic scans when media is inserted, connected, or logically mounted' },
          { id: '5.3.4', title: 'Audit logs for the anti-malware solution are enabled and retained in accordance with Requirement 10.5.1' },
          { id: '5.3.5', title: 'Anti-malware mechanisms cannot be disabled or altered by users, unless specifically documented and authorized' },
        ],
      },
      {
        id: '5.4',
        name: 'Anti-phishing mechanisms protect users against phishing attacks',
        requirements: [
          { id: '5.4.1', title: 'Processes and automated mechanisms are in place to detect and protect personnel against phishing attacks' },
        ],
      },
    ],
  },
  // Requirement 6: Develop and Maintain Secure Systems and Software
  {
    id: '6',
    name: 'Develop and Maintain Secure Systems and Software',
    subRequirements: [
      {
        id: '6.1',
        name: 'Processes and mechanisms for developing secure systems and software are defined and understood',
        requirements: [
          { id: '6.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '6.1.2', title: 'Roles and responsibilities for performing activities in Requirement 6 are documented, assigned, and understood' },
        ],
      },
      {
        id: '6.2',
        name: 'Bespoke and custom software is developed securely',
        requirements: [
          { id: '6.2.1', title: 'Bespoke and custom software are developed securely based on industry standards and/or best practices for secure development' },
          { id: '6.2.2', title: 'Software development personnel are trained at least once every 12 months on software security relevant to their job function' },
          { id: '6.2.3', title: 'Bespoke and custom software is reviewed prior to being released into production to identify and correct potential coding vulnerabilities' },
          { id: '6.2.3.1', title: 'If manual code reviews are performed, they include review by individuals other than the originating code author' },
          { id: '6.2.4', title: 'Software engineering techniques or methods are defined and in use to prevent or mitigate common software attacks' },
        ],
      },
      {
        id: '6.3',
        name: 'Security vulnerabilities are identified and addressed',
        requirements: [
          { id: '6.3.1', title: 'Security vulnerabilities are identified and managed through a process that includes using reputable outside sources' },
          { id: '6.3.2', title: 'An inventory of bespoke and custom software, and third-party software components incorporated into bespoke and custom software is maintained' },
          { id: '6.3.3', title: 'All system components are protected from known vulnerabilities by installing applicable security patches/updates' },
        ],
      },
      {
        id: '6.4',
        name: 'Public-facing web applications are protected against attacks',
        requirements: [
          { id: '6.4.1', title: 'For public-facing web applications, new threats and vulnerabilities are addressed on an ongoing basis' },
          { id: '6.4.2', title: 'For public-facing web applications, an automated technical solution is deployed that continually detects and prevents web-based attacks' },
          { id: '6.4.3', title: 'All payment page scripts that are loaded and executed in the consumer browser are managed' },
        ],
      },
      {
        id: '6.5',
        name: 'Changes to all system components are managed securely',
        requirements: [
          { id: '6.5.1', title: 'Changes to all system components in the production environment are made according to established procedures' },
          { id: '6.5.2', title: 'Upon completion of a significant change, all applicable PCI DSS requirements are confirmed to be in place' },
          { id: '6.5.3', title: 'Pre-production environments are separated from production environments and the separation is enforced with access controls' },
          { id: '6.5.4', title: 'Production data (live PANs) are not used for testing or development, except when the environment is in a PCI DSS-compliant manner' },
          { id: '6.5.5', title: 'Live PANs are not used in pre-production environments, except where those environments are included in the CDE' },
          { id: '6.5.6', title: 'Test data and test accounts are removed from system components before the system goes into production' },
        ],
      },
    ],
  },
  // Requirement 7: Restrict Access to System Components
  {
    id: '7',
    name: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
    subRequirements: [
      {
        id: '7.1',
        name: 'Processes and mechanisms for restricting access to CHD are defined and understood',
        requirements: [
          { id: '7.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '7.1.2', title: 'Roles and responsibilities for performing activities in Requirement 7 are documented, assigned, and understood' },
        ],
      },
      {
        id: '7.2',
        name: 'Access to system components and data is appropriately defined and assigned',
        requirements: [
          { id: '7.2.1', title: 'An access control model is defined and includes granting access as follows: appropriate access depending on job classification and function, and least privileges necessary' },
          { id: '7.2.2', title: 'Access is assigned to users, including privileged users, based on job classification and function' },
          { id: '7.2.3', title: 'Required privileges are approved by authorized personnel' },
          { id: '7.2.4', title: 'All user accounts and related access privileges, including third-party/vendor accounts, are reviewed at least once every six months' },
          { id: '7.2.5', title: 'All application and system accounts and related access privileges are assigned and managed per least privilege' },
          { id: '7.2.5.1', title: 'All access by application and system accounts and related access privileges are reviewed periodically' },
          { id: '7.2.6', title: 'All user access to query repositories of stored cardholder data is restricted according to defined criteria' },
        ],
      },
      {
        id: '7.3',
        name: 'Access to system components and data is managed via an access control system(s)',
        requirements: [
          { id: '7.3.1', title: 'An access control system(s) is in place that restricts access based on a user need to know and covers all system components' },
          { id: '7.3.2', title: 'The access control system(s) is configured to enforce permissions assigned to individuals, applications, and systems' },
          { id: '7.3.3', title: 'The access control system(s) is set to deny all by default' },
        ],
      },
    ],
  },
  // Requirement 8: Identify Users and Authenticate Access
  {
    id: '8',
    name: 'Identify Users and Authenticate Access to System Components',
    subRequirements: [
      {
        id: '8.1',
        name: 'Processes and mechanisms for identifying users and authenticating access are defined and understood',
        requirements: [
          { id: '8.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '8.1.2', title: 'Roles and responsibilities for performing activities in Requirement 8 are documented, assigned, and understood' },
        ],
      },
      {
        id: '8.2',
        name: 'User identification and related accounts for users and administrators are strictly managed',
        requirements: [
          { id: '8.2.1', title: 'All users are assigned a unique ID before access to system components or cardholder data is allowed' },
          { id: '8.2.2', title: 'Group, shared, or generic accounts, or other shared authentication credentials are only used when necessary on an exception basis' },
          { id: '8.2.3', title: 'Additional requirement for service providers only: Unique authentication credentials are used for each customer premises' },
          { id: '8.2.4', title: 'Addition, deletion, and modification of user IDs, authentication factors, and other identifier objects are managed' },
          { id: '8.2.5', title: 'Access for terminated users is immediately revoked' },
          { id: '8.2.6', title: 'Inactive user accounts are removed or disabled within 90 days of inactivity' },
          { id: '8.2.7', title: 'Accounts used by third parties to access, support, or maintain system components via remote access are managed per specific conditions' },
          { id: '8.2.8', title: 'If a user session has been idle for more than 15 minutes, the user is required to re-authenticate to re-activate the terminal or session' },
        ],
      },
      {
        id: '8.3',
        name: 'Strong authentication for users and administrators is established and managed',
        requirements: [
          { id: '8.3.1', title: 'All user access to system components for users and administrators is authenticated with at least one authentication factor' },
          { id: '8.3.2', title: 'Strong cryptography is used to render all authentication factors unreadable during transmission and storage' },
          { id: '8.3.3', title: 'User identity is verified before modifying any authentication factor' },
          { id: '8.3.4', title: 'Invalid authentication attempts are limited by locking out the user ID after not more than 10 attempts' },
          { id: '8.3.5', title: 'If a user ID is locked out due to consecutive invalid login attempts, that ID remains locked for a minimum of 30 minutes' },
          { id: '8.3.6', title: 'If a password/passphrase is used as an authentication factor, it meets minimum levels of complexity and is at least 12 characters' },
          { id: '8.3.7', title: 'Individuals are not allowed to submit a new password/passphrase that is the same as any of the last four used' },
          { id: '8.3.8', title: 'Authentication policies and procedures are documented and communicated to all users' },
          { id: '8.3.9', title: 'If passwords/passphrases are used as the only authentication factor for user access, passwords/passphrases are changed at least once every 90 days' },
          { id: '8.3.10', title: 'Additional requirement for service providers only: If passwords/passphrases are used as the only authentication factor for customer user access, guidance is provided to customer users' },
          { id: '8.3.10.1', title: 'Additional requirement for service providers only: If passwords/passphrases are used as the only authentication factor for customer user access, either passwords/passphrases are changed at least once every 90 days OR the security posture of accounts is dynamically analyzed' },
          { id: '8.3.11', title: 'Where authentication factors such as physical or logical security tokens, smart cards, or certificates are used, use of factors is as follows: factors are assigned to an individual user, physical factors are not shared, access is immediately revoked for any terminated user' },
        ],
      },
      {
        id: '8.4',
        name: 'Multi-factor authentication (MFA) is implemented to secure access into the CDE',
        requirements: [
          { id: '8.4.1', title: 'MFA is implemented for all non-console access into the CDE for personnel with administrative access' },
          { id: '8.4.2', title: 'MFA is implemented for all access into the CDE' },
          { id: '8.4.3', title: 'MFA is implemented for all remote network access originating from outside the entity network that could access or impact the CDE' },
        ],
      },
      {
        id: '8.5',
        name: 'Multi-factor authentication (MFA) systems are configured to prevent misuse',
        requirements: [
          { id: '8.5.1', title: 'MFA systems are implemented so that authentication factors are independent, and access to one factor does not provide access to another' },
        ],
      },
      {
        id: '8.6',
        name: 'Use of application and system accounts is strictly managed',
        requirements: [
          { id: '8.6.1', title: 'If accounts used by systems or applications can be used for interactive login, they are managed as follows: interactive use is prevented unless needed for an exceptional circumstance, and interactive use is limited to the time needed' },
          { id: '8.6.2', title: 'Passwords/passphrases for any application and system accounts that can be used for interactive login are not hard coded in scripts, configuration files, or bespoke and custom source code' },
          { id: '8.6.3', title: 'Passwords/passphrases for any application and system accounts are protected against misuse' },
        ],
      },
    ],
  },
  // Requirement 9: Restrict Physical Access
  {
    id: '9',
    name: 'Restrict Physical Access to Cardholder Data',
    subRequirements: [
      {
        id: '9.1',
        name: 'Processes and mechanisms for restricting physical access to CHD are defined and understood',
        requirements: [
          { id: '9.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '9.1.2', title: 'Roles and responsibilities for performing activities in Requirement 9 are documented, assigned, and understood' },
        ],
      },
      {
        id: '9.2',
        name: 'Physical access controls manage entry into facilities and systems containing CHD',
        requirements: [
          { id: '9.2.1', title: 'Appropriate facility entry controls are in place to restrict physical access to systems in the CDE' },
          { id: '9.2.1.1', title: 'Individual physical access to sensitive areas within the CDE is monitored with either video cameras or physical access control mechanisms' },
          { id: '9.2.2', title: 'Physical and/or logical controls are implemented to restrict use of publicly accessible network jacks within the facility' },
          { id: '9.2.3', title: 'Physical access to wireless access points, gateways, networking/communications hardware, and telecommunication lines within the facility is restricted' },
          { id: '9.2.4', title: 'Access to consoles in sensitive areas is restricted via locking when not in use' },
        ],
      },
      {
        id: '9.3',
        name: 'Physical access for personnel and visitors is authorized and managed',
        requirements: [
          { id: '9.3.1', title: 'Procedures are implemented for authorizing and managing physical access of personnel to the CDE' },
          { id: '9.3.1.1', title: 'Physical access to sensitive areas within the CDE for personnel is controlled' },
          { id: '9.3.2', title: 'Procedures are implemented for authorizing and managing visitor access to the CDE' },
          { id: '9.3.3', title: 'Visitor badges or identification are surrendered or deactivated before visitors leave the facility or at the date of expiration' },
          { id: '9.3.4', title: 'A visitor log is used to maintain a physical record of visitor activity within the facility and within sensitive areas' },
        ],
      },
      {
        id: '9.4',
        name: 'Media with cardholder data is securely stored, accessed, distributed, and destroyed',
        requirements: [
          { id: '9.4.1', title: 'All media with cardholder data is physically secured' },
          { id: '9.4.1.1', title: 'Offline media backups with cardholder data are stored in a secure location' },
          { id: '9.4.1.2', title: 'The security of the offline media backup location(s) is reviewed at least once every 12 months' },
          { id: '9.4.2', title: 'All media with cardholder data is classified in accordance with the sensitivity of the data' },
          { id: '9.4.3', title: 'Media with cardholder data sent outside the facility is secured per specific conditions' },
          { id: '9.4.4', title: 'Management approves all media with cardholder data that is moved outside the facility' },
          { id: '9.4.5', title: 'Inventory logs of all electronic media with cardholder data are maintained' },
          { id: '9.4.5.1', title: 'Inventories of electronic media with cardholder data are conducted at least once every 12 months' },
          { id: '9.4.6', title: 'Hard-copy materials with cardholder data are destroyed when no longer needed for business or legal reasons' },
          { id: '9.4.7', title: 'Electronic media with cardholder data is destroyed when no longer needed for business or legal reasons' },
        ],
      },
      {
        id: '9.5',
        name: 'Point of interaction (POI) devices are protected from tampering and unauthorized substitution',
        requirements: [
          { id: '9.5.1', title: 'POI devices that capture payment card data via direct physical interaction with the payment card form factor are protected from tampering and unauthorized substitution' },
          { id: '9.5.1.1', title: 'An up-to-date list of POI devices is maintained' },
          { id: '9.5.1.2', title: 'POI device surfaces are periodically inspected to detect tampering and unauthorized substitution' },
          { id: '9.5.1.2.1', title: 'The frequency of periodic POI device inspections and the type of inspections performed is defined in the targeted risk analysis' },
          { id: '9.5.1.3', title: 'Training is provided for personnel in POI environments to be aware of attempted tampering or replacement of POI devices' },
        ],
      },
    ],
  },
  // Requirement 10: Log and Monitor All Access
  {
    id: '10',
    name: 'Log and Monitor All Access to System Components and Cardholder Data',
    subRequirements: [
      {
        id: '10.1',
        name: 'Processes and mechanisms for logging and monitoring all access to CHD and system components are defined and understood',
        requirements: [
          { id: '10.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '10.1.2', title: 'Roles and responsibilities for performing activities in Requirement 10 are documented, assigned, and understood' },
        ],
      },
      {
        id: '10.2',
        name: 'Audit logs are implemented to support the detection of anomalies and suspicious activity',
        requirements: [
          { id: '10.2.1', title: 'Audit logs are enabled and active for all system components and cardholder data' },
          { id: '10.2.1.1', title: 'Audit logs capture all individual user access to cardholder data' },
          { id: '10.2.1.2', title: 'Audit logs capture all actions taken by any individual with administrative access' },
          { id: '10.2.1.3', title: 'Audit logs capture all access to audit logs' },
          { id: '10.2.1.4', title: 'Audit logs capture all invalid logical access attempts' },
          { id: '10.2.1.5', title: 'Audit logs capture all changes to identification and authentication credentials' },
          { id: '10.2.1.6', title: 'Audit logs capture initialization of new audit logs, and starting, stopping, or pausing of existing audit logs' },
          { id: '10.2.1.7', title: 'Audit logs capture creation and deletion of system-level objects' },
          { id: '10.2.2', title: 'Audit logs record relevant information for each auditable event' },
        ],
      },
      {
        id: '10.3',
        name: 'Audit logs are protected from destruction and unauthorized modifications',
        requirements: [
          { id: '10.3.1', title: 'Read access to audit logs files is limited to those with a job-related need' },
          { id: '10.3.2', title: 'Audit log files are protected to prevent modifications by individuals' },
          { id: '10.3.3', title: 'Audit log files, including those for external-facing technologies, are promptly backed up to a secure, central, internal log server(s) or other media that is difficult to modify' },
          { id: '10.3.4', title: 'File integrity monitoring or change-detection mechanisms is used on audit logs to ensure that existing log data cannot be changed without generating alerts' },
        ],
      },
      {
        id: '10.4',
        name: 'Audit logs are reviewed to identify anomalies or suspicious activity',
        requirements: [
          { id: '10.4.1', title: 'Security events and audit logs are reviewed at least once daily to identify anomalies or suspicious activity' },
          { id: '10.4.1.1', title: 'Automated mechanisms are used to perform audit log reviews' },
          { id: '10.4.2', title: 'Logs of all other system components are reviewed periodically based on the organization policies and risk management strategy' },
          { id: '10.4.2.1', title: 'The frequency of periodic log reviews for all other system components is defined in the targeted risk analysis' },
          { id: '10.4.3', title: 'Exceptions and anomalies identified during the review process are addressed' },
        ],
      },
      {
        id: '10.5',
        name: 'Audit log history is retained and available for analysis',
        requirements: [
          { id: '10.5.1', title: 'Retain audit log history for at least 12 months, with at least the most recent three months immediately available for analysis' },
        ],
      },
      {
        id: '10.6',
        name: 'Time-synchronization mechanisms support consistent time settings across all systems',
        requirements: [
          { id: '10.6.1', title: 'System clocks and time are synchronized using time-synchronization technology' },
          { id: '10.6.2', title: 'Systems are configured to the correct and consistent time' },
          { id: '10.6.3', title: 'Time synchronization settings and data are protected' },
        ],
      },
      {
        id: '10.7',
        name: 'Failures of critical security control systems are detected, reported, and responded to promptly',
        requirements: [
          { id: '10.7.1', title: 'Additional requirement for service providers only: Failures of critical security control systems are detected, alerted, and addressed promptly' },
          { id: '10.7.2', title: 'Failures of critical security control systems are detected, alerted, and addressed promptly' },
          { id: '10.7.3', title: 'Failures of any critical security controls systems are responded to promptly' },
        ],
      },
    ],
  },
  // Requirement 11: Test Security of Systems and Networks Regularly
  {
    id: '11',
    name: 'Test Security of Systems and Networks Regularly',
    subRequirements: [
      {
        id: '11.1',
        name: 'Processes and mechanisms for testing security of systems and networks are defined and understood',
        requirements: [
          { id: '11.1.1', title: 'All security policies and operational procedures are documented, kept up to date, in use, and known' },
          { id: '11.1.2', title: 'Roles and responsibilities for performing activities in Requirement 11 are documented, assigned, and understood' },
        ],
      },
      {
        id: '11.2',
        name: 'Wireless access points are identified and monitored, and unauthorized wireless access points are addressed',
        requirements: [
          { id: '11.2.1', title: 'Authorized and unauthorized wireless access points are managed' },
          { id: '11.2.2', title: 'An inventory of authorized wireless access points is maintained, including a documented business justification' },
        ],
      },
      {
        id: '11.3',
        name: 'External and internal vulnerabilities are regularly identified, prioritized, and addressed',
        requirements: [
          { id: '11.3.1', title: 'Internal vulnerability scans are performed at least once every three months and after any significant change' },
          { id: '11.3.1.1', title: 'All other applicable vulnerabilities found during internal vulnerability scans are managed' },
          { id: '11.3.1.2', title: 'Internal vulnerability scans are performed via authenticated scanning' },
          { id: '11.3.1.3', title: 'Internal vulnerability scans are performed after any significant change' },
          { id: '11.3.2', title: 'External vulnerability scans are performed at least once every three months and after any significant change by a PCI SSC ASV' },
          { id: '11.3.2.1', title: 'External vulnerability scans are performed after any significant change by a PCI SSC ASV' },
        ],
      },
      {
        id: '11.4',
        name: 'External and internal penetration testing is regularly performed, and exploitable vulnerabilities and security weaknesses are corrected',
        requirements: [
          { id: '11.4.1', title: 'A penetration testing methodology is defined, documented, and implemented by the entity' },
          { id: '11.4.2', title: 'Internal penetration testing is performed at least once every 12 months and after any significant change' },
          { id: '11.4.3', title: 'External penetration testing is performed at least once every 12 months and after any significant change' },
          { id: '11.4.4', title: 'Exploitable vulnerabilities and security weaknesses found during penetration testing are corrected' },
          { id: '11.4.5', title: 'If segmentation is used to isolate the CDE from other networks, penetration tests are performed on segmentation controls at least once every 12 months and after changes to segmentation controls/methods' },
          { id: '11.4.6', title: 'Additional requirement for service providers only: If segmentation is used, penetration testing on segmentation controls is performed at least once every six months and after any changes' },
          { id: '11.4.7', title: 'Additional requirement for multi-tenant service providers only: Multi-tenant service providers support their customers for external penetration testing per certain requirements' },
        ],
      },
      {
        id: '11.5',
        name: 'Network intrusions and unexpected file changes are detected and responded to',
        requirements: [
          { id: '11.5.1', title: 'Intrusion-detection and/or intrusion-prevention techniques are used to detect and/or prevent intrusions into the network' },
          { id: '11.5.1.1', title: 'Intrusion-detection and/or intrusion-prevention techniques detect, alert on/prevent, and address covert malware communication channels' },
          { id: '11.5.2', title: 'A change-detection mechanism is deployed to alert personnel to unauthorized modification of critical system files, configuration files, or content files' },
        ],
      },
      {
        id: '11.6',
        name: 'Unauthorized changes on payment pages are detected and responded to',
        requirements: [
          { id: '11.6.1', title: 'A change and tamper detection mechanism is deployed to alert personnel to unauthorized modification of HTTP headers and contents of payment pages received by consumer browsers' },
        ],
      },
    ],
  },
  // Requirement 12: Support Information Security with Organizational Policies and Programs
  {
    id: '12',
    name: 'Support Information Security with Organizational Policies and Programs',
    subRequirements: [
      {
        id: '12.1',
        name: 'A comprehensive information security policy is known and maintained',
        requirements: [
          { id: '12.1.1', title: 'An overall information security policy is established, published, maintained, and disseminated to all relevant personnel' },
          { id: '12.1.2', title: 'The information security policy is reviewed at least once every 12 months and updated as needed to reflect changes' },
          { id: '12.1.3', title: 'The security policy clearly defines information security roles and responsibilities for all personnel' },
          { id: '12.1.4', title: 'Responsibility for information security is formally assigned to a Chief Information Security Officer or other information security knowledgeable executive' },
        ],
      },
      {
        id: '12.2',
        name: 'Acceptable use policies for end-user technologies are defined and implemented',
        requirements: [
          { id: '12.2.1', title: 'Acceptable use policies for end-user technologies are documented and implemented' },
        ],
      },
      {
        id: '12.3',
        name: 'Risks to the cardholder data environment are formally identified, evaluated, and managed',
        requirements: [
          { id: '12.3.1', title: 'Each PCI DSS requirement that provides flexibility for how frequently it is performed is supported by a targeted risk analysis' },
          { id: '12.3.2', title: 'A targeted risk analysis is performed for each PCI DSS requirement that the entity meets with the customized approach' },
          { id: '12.3.3', title: 'Cryptographic cipher suites and protocols in use are documented and reviewed at least once every 12 months' },
          { id: '12.3.4', title: 'Hardware and software technologies in use are reviewed at least once every 12 months' },
        ],
      },
      {
        id: '12.4',
        name: 'PCI DSS compliance is managed',
        requirements: [
          { id: '12.4.1', title: 'Additional requirement for service providers only: Responsibility is established by executive management for the protection of CHD and a PCI DSS compliance program' },
          { id: '12.4.2', title: 'Additional requirement for service providers only: Reviews are performed at least once every three months to confirm that personnel are performing their tasks in accordance with all security policies' },
          { id: '12.4.2.1', title: 'Additional requirement for service providers only: Reviews performed in accordance with Requirement 12.4.2 are documented' },
        ],
      },
      {
        id: '12.5',
        name: 'PCI DSS scope is documented and validated',
        requirements: [
          { id: '12.5.1', title: 'An inventory of system components that are in scope for PCI DSS, including a description of function/use, is maintained and kept current' },
          { id: '12.5.2', title: 'PCI DSS scope is documented and confirmed by the entity at least once every 12 months and upon significant change to the in-scope environment' },
          { id: '12.5.2.1', title: 'Additional requirement for service providers only: PCI DSS scope is documented and confirmed by the entity at least once every six months and upon significant change' },
          { id: '12.5.3', title: 'Additional requirement for service providers only: Significant changes to organizational structure result in a documented review of the impact to PCI DSS scope' },
        ],
      },
      {
        id: '12.6',
        name: 'Security awareness education is an ongoing activity',
        requirements: [
          { id: '12.6.1', title: 'A formal security awareness program is implemented to make all personnel aware of the entity information security policy' },
          { id: '12.6.2', title: 'The security awareness program is reviewed at least once every 12 months and updated as needed' },
          { id: '12.6.3', title: 'Personnel receive security awareness training upon hire and at least once every 12 months' },
          { id: '12.6.3.1', title: 'Security awareness training includes awareness of threats and vulnerabilities that could impact the security of the CDE' },
          { id: '12.6.3.2', title: 'Security awareness training includes awareness about the acceptable use of end-user technologies' },
        ],
      },
      {
        id: '12.7',
        name: 'Personnel are screened to reduce risks from insider threats',
        requirements: [
          { id: '12.7.1', title: 'Potential personnel who will have access to the CDE are screened, within the constraints of local laws, prior to hire' },
        ],
      },
      {
        id: '12.8',
        name: 'Risk to information assets associated with third-party service provider (TPSP) relationships is managed',
        requirements: [
          { id: '12.8.1', title: 'A list of all third-party service providers with which account data is shared or that could affect the security of account data is maintained' },
          { id: '12.8.2', title: 'Written agreements with TPSPs are maintained, including acknowledgment that TPSPs are responsible for the security of account data they possess' },
          { id: '12.8.3', title: 'An established process is implemented for engaging TPSPs, including proper due diligence prior to engagement' },
          { id: '12.8.4', title: 'A program is implemented to monitor TPSPs PCI DSS compliance status at least once every 12 months' },
          { id: '12.8.5', title: 'Information is maintained about which PCI DSS requirements are managed by each TPSP, which are managed by the entity, and any shared between the TPSP and entity' },
        ],
      },
      {
        id: '12.9',
        name: 'Third-party service providers (TPSPs) support their customers PCI DSS compliance',
        requirements: [
          { id: '12.9.1', title: 'Additional requirement for service providers only: TPSPs acknowledge in writing to customers that they are responsible for the security of account data they possess or otherwise store, process, or transmit on behalf of the customer' },
          { id: '12.9.2', title: 'Additional requirement for service providers only: TPSPs support their customers requests for information to meet certain requirements' },
        ],
      },
      {
        id: '12.10',
        name: 'Suspected and confirmed security incidents that could impact the CDE are responded to immediately',
        requirements: [
          { id: '12.10.1', title: 'An incident response plan exists and is ready to be activated immediately in the event of a suspected or confirmed security incident' },
          { id: '12.10.2', title: 'At least once every 12 months, the security incident response plan is reviewed and the content is updated as needed, and tested' },
          { id: '12.10.3', title: 'Specific personnel are designated to be available on a 24/7 basis to respond to suspected or confirmed security incidents' },
          { id: '12.10.4', title: 'Personnel responsible for responding to suspected and confirmed security incidents are appropriately and periodically trained' },
          { id: '12.10.4.1', title: 'The frequency of periodic training for incident response personnel is defined in the targeted risk analysis' },
          { id: '12.10.5', title: 'The security incident response plan includes monitoring and responding to alerts from security monitoring systems' },
          { id: '12.10.6', title: 'The security incident response plan is modified and evolved according to lessons learned and to incorporate industry developments' },
          { id: '12.10.7', title: 'Incident response procedures are in place, to be initiated upon the detection of stored PAN anywhere it is not expected' },
        ],
      },
    ],
  },
];

// Helper function to count total requirements
export function countPCIDSSRequirements(): { principal: number; sub: number; total: number } {
  let principal = 0;
  let sub = 0;
  let total = 0;

  PCI_DSS_V4_REQUIREMENTS.forEach(pr => {
    principal++;
    pr.subRequirements.forEach(sr => {
      sub++;
      total += sr.requirements.length;
    });
  });

  return { principal, sub, total };
}

// Export flat list of all requirements for easy iteration
export function getAllPCIDSSRequirements(): PCIRequirement[] {
  const all: PCIRequirement[] = [];
  PCI_DSS_V4_REQUIREMENTS.forEach(pr => {
    pr.subRequirements.forEach(sr => {
      sr.requirements.forEach(r => {
        all.push(r);
      });
    });
  });
  return all;
}
