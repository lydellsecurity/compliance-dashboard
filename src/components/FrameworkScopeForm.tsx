/**
 * Framework Scope Definition Forms
 *
 * Framework-specific scoping questions that determine which requirements
 * are applicable and how they should be assessed.
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { FrameworkId } from '../constants/controls';
import { FRAMEWORKS } from '../constants/controls';
import type {
  FrameworkScope,
  PCIDSSScope,
  HIPAAScope,
  SOC2Scope,
  ISO27001Scope,
  NISTCSFScope,
  GDPRScope,
} from '../types/requirement-assessment.types';

// ============================================
// TYPES
// ============================================

interface FrameworkScopeFormProps {
  frameworkId: FrameworkId;
  existingScope: FrameworkScope | null;
  onSubmit: (scope: FrameworkScope) => void;
  onBack: () => void;
}

const FRAMEWORK_COLORS: Record<FrameworkId, string> = {
  'PCIDSS': '#DC2626',
  'SOC2': '#3B82F6',
  'ISO27001': '#10B981',
  'HIPAA': '#8B5CF6',
  'NIST': '#F59E0B',
  'GDPR': '#2563EB',
};

// ============================================
// FORM COMPONENTS
// ============================================

const FormSection: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold text-slate-900 dark:text-steel-100">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-steel-400 mt-1">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const RadioOption: React.FC<{
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}> = ({ name, value, checked, onChange, label, description }) => (
  <label className="flex items-start gap-3 p-3 bg-white dark:bg-steel-800 rounded-lg border border-slate-200 dark:border-steel-700 cursor-pointer hover:border-slate-300 dark:hover:border-steel-600 transition-colors">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="mt-1"
    />
    <div>
      <span className="font-medium text-slate-900 dark:text-steel-100">{label}</span>
      {description && (
        <p className="text-sm text-slate-500 dark:text-steel-400">{description}</p>
      )}
    </div>
  </label>
);

const CheckboxOption: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-3 p-3 bg-white dark:bg-steel-800 rounded-lg border border-slate-200 dark:border-steel-700 cursor-pointer hover:border-slate-300 dark:hover:border-steel-600 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="mt-1"
    />
    <div>
      <span className="font-medium text-slate-900 dark:text-steel-100">{label}</span>
      {description && (
        <p className="text-sm text-slate-500 dark:text-steel-400">{description}</p>
      )}
    </div>
  </label>
);

// ============================================
// PCI DSS SCOPE FORM
// ============================================

const PCIDSSScopeForm: React.FC<{
  scope: PCIDSSScope;
  onChange: (scope: PCIDSSScope) => void;
}> = ({ scope, onChange }) => {
  return (
    <div className="space-y-6">
      <FormSection
        title="Entity Type"
        description="Are you a merchant or service provider?"
      >
        <div className="space-y-2">
          <RadioOption
            name="entityType"
            value="merchant"
            checked={scope.entityType === 'merchant'}
            onChange={() => onChange({ ...scope, entityType: 'merchant' })}
            label="Merchant"
            description="Accepts payment cards as payment for goods or services"
          />
          <RadioOption
            name="entityType"
            value="service_provider"
            checked={scope.entityType === 'service_provider'}
            onChange={() => onChange({ ...scope, entityType: 'service_provider' })}
            label="Service Provider"
            description="Processes, stores, or transmits cardholder data on behalf of merchants"
          />
        </div>
      </FormSection>

      <FormSection
        title="SAQ Type"
        description="Which Self-Assessment Questionnaire applies? (Skip if using full ROC)"
      >
        <select
          value={scope.saqType || ''}
          onChange={e => onChange({ ...scope, saqType: e.target.value as PCIDSSScope['saqType'] || undefined })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
        >
          <option value="">Full ROC / Not Applicable</option>
          <option value="A">SAQ A - Card-not-present, all cardholder data functions outsourced</option>
          <option value="A-EP">SAQ A-EP - E-commerce with partial outsourcing</option>
          <option value="B">SAQ B - Imprint machines or standalone dial-out terminals</option>
          <option value="B-IP">SAQ B-IP - Standalone IP-connected PTS terminals</option>
          <option value="C">SAQ C - Payment application systems connected to the Internet</option>
          <option value="C-VT">SAQ C-VT - Virtual terminals, no electronic cardholder data storage</option>
          <option value="D">SAQ D - All other merchants</option>
          <option value="D-SP">SAQ D - Service Providers</option>
          <option value="P2PE">SAQ P2PE - Hardware payment terminals in a P2PE solution</option>
        </select>
      </FormSection>

      <FormSection
        title="Cardholder Data Environment (CDE)"
        description="Configuration of your cardholder data environment"
      >
        <div className="space-y-2">
          <CheckboxOption
            checked={scope.cdeDefinied}
            onChange={checked => onChange({ ...scope, cdeDefinied: checked })}
            label="CDE is clearly defined and documented"
            description="All systems that store, process, or transmit cardholder data are identified"
          />
          <CheckboxOption
            checked={scope.networkSegmented}
            onChange={checked => onChange({ ...scope, networkSegmented: checked })}
            label="Network segmentation is implemented"
            description="CDE is isolated from out-of-scope networks"
          />
          {scope.networkSegmented && (
            <CheckboxOption
              checked={scope.segmentationValidated}
              onChange={checked => onChange({ ...scope, segmentationValidated: checked })}
              label="Segmentation has been validated by penetration testing"
              description="Testing confirms segmentation controls are effective"
            />
          )}
        </div>
      </FormSection>

      <FormSection
        title="Payment Channels"
        description="Which payment channels are in scope?"
      >
        <div className="grid grid-cols-2 gap-2">
          <CheckboxOption
            checked={scope.channelsInScope.ecommerce}
            onChange={checked => onChange({
              ...scope,
              channelsInScope: { ...scope.channelsInScope, ecommerce: checked }
            })}
            label="E-commerce"
          />
          <CheckboxOption
            checked={scope.channelsInScope.moto}
            onChange={checked => onChange({
              ...scope,
              channelsInScope: { ...scope.channelsInScope, moto: checked }
            })}
            label="Mail Order / Telephone Order"
          />
          <CheckboxOption
            checked={scope.channelsInScope.pos}
            onChange={checked => onChange({
              ...scope,
              channelsInScope: { ...scope.channelsInScope, pos: checked }
            })}
            label="Point of Sale (POS)"
          />
          <CheckboxOption
            checked={scope.channelsInScope.cardPresent}
            onChange={checked => onChange({
              ...scope,
              channelsInScope: { ...scope.channelsInScope, cardPresent: checked }
            })}
            label="Card Present"
          />
        </div>
      </FormSection>

      <FormSection
        title="Additional Configuration"
      >
        <div className="space-y-2">
          <CheckboxOption
            checked={scope.thirdPartyProcessing}
            onChange={checked => onChange({ ...scope, thirdPartyProcessing: checked })}
            label="Third-party payment processing"
            description="A third-party processor handles some cardholder data functions"
          />
          <CheckboxOption
            checked={scope.tokenizationUsed}
            onChange={checked => onChange({ ...scope, tokenizationUsed: checked })}
            label="Tokenization is used"
            description="Cardholder data is replaced with surrogate values"
          />
          <CheckboxOption
            checked={scope.p2peValidated}
            onChange={checked => onChange({ ...scope, p2peValidated: checked })}
            label="PCI-validated P2PE solution"
            description="Using a validated Point-to-Point Encryption solution"
          />
        </div>
      </FormSection>
    </div>
  );
};

// ============================================
// HIPAA SCOPE FORM
// ============================================

const HIPAAScopeForm: React.FC<{
  scope: HIPAAScope;
  onChange: (scope: HIPAAScope) => void;
}> = ({ scope, onChange }) => {
  return (
    <div className="space-y-6">
      <FormSection
        title="Entity Type"
        description="What type of HIPAA-regulated entity are you?"
      >
        <div className="space-y-2">
          <RadioOption
            name="entityType"
            value="covered_entity"
            checked={scope.entityType === 'covered_entity'}
            onChange={() => onChange({ ...scope, entityType: 'covered_entity' })}
            label="Covered Entity"
            description="Health plan, healthcare provider, or healthcare clearinghouse"
          />
          <RadioOption
            name="entityType"
            value="business_associate"
            checked={scope.entityType === 'business_associate'}
            onChange={() => onChange({ ...scope, entityType: 'business_associate' })}
            label="Business Associate"
            description="Creates, receives, maintains, or transmits PHI on behalf of a covered entity"
          />
        </div>
      </FormSection>

      {scope.entityType === 'covered_entity' && (
        <FormSection
          title="Covered Entity Type"
          description="What type of covered entity?"
        >
          <div className="space-y-2">
            <RadioOption
              name="coveredEntityType"
              value="health_plan"
              checked={scope.coveredEntityType === 'health_plan'}
              onChange={() => onChange({ ...scope, coveredEntityType: 'health_plan' })}
              label="Health Plan"
              description="Individual or group plan providing or paying for medical care"
            />
            <RadioOption
              name="coveredEntityType"
              value="healthcare_provider"
              checked={scope.coveredEntityType === 'healthcare_provider'}
              onChange={() => onChange({ ...scope, coveredEntityType: 'healthcare_provider' })}
              label="Healthcare Provider"
              description="Provider transmitting health information electronically"
            />
            <RadioOption
              name="coveredEntityType"
              value="healthcare_clearinghouse"
              checked={scope.coveredEntityType === 'healthcare_clearinghouse'}
              onChange={() => onChange({ ...scope, coveredEntityType: 'healthcare_clearinghouse' })}
              label="Healthcare Clearinghouse"
              description="Entity processing health information between non-standard and standard formats"
            />
          </div>
        </FormSection>
      )}

      <FormSection
        title="Hybrid Entity Status"
        description="Does your organization have both HIPAA-regulated and non-regulated functions?"
      >
        <div className="space-y-2">
          <CheckboxOption
            checked={scope.hybridEntity}
            onChange={checked => onChange({ ...scope, hybridEntity: checked })}
            label="Hybrid Entity"
            description="Organization performs both covered and non-covered functions"
          />
        </div>

        {scope.hybridEntity && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
              Designated Healthcare Components
            </label>
            <textarea
              value={scope.designatedComponents?.join('\n') || ''}
              onChange={e => onChange({
                ...scope,
                designatedComponents: e.target.value.split('\n').filter(Boolean)
              })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
              placeholder="List designated healthcare components (one per line)"
            />
          </div>
        )}
      </FormSection>

      <FormSection
        title="ePHI Systems"
      >
        <div className="space-y-2">
          <CheckboxOption
            checked={scope.ephiSystemsIdentified}
            onChange={checked => onChange({ ...scope, ephiSystemsIdentified: checked })}
            label="ePHI systems are identified and documented"
            description="All systems creating, receiving, maintaining, or transmitting ePHI are known"
          />
          <CheckboxOption
            checked={scope.businessAssociateAgreementsInPlace}
            onChange={checked => onChange({ ...scope, businessAssociateAgreementsInPlace: checked })}
            label="Business Associate Agreements are in place"
            description="BAAs executed with all business associates handling PHI"
          />
        </div>
      </FormSection>
    </div>
  );
};

// ============================================
// SOC 2 SCOPE FORM
// ============================================

const SOC2ScopeForm: React.FC<{
  scope: SOC2Scope;
  onChange: (scope: SOC2Scope) => void;
}> = ({ scope, onChange }) => {
  return (
    <div className="space-y-6">
      <FormSection
        title="Report Type"
        description="Which type of SOC 2 report?"
      >
        <div className="space-y-2">
          <RadioOption
            name="reportType"
            value="type1"
            checked={scope.reportType === 'type1'}
            onChange={() => onChange({ ...scope, reportType: 'type1' })}
            label="Type 1"
            description="Opinion on the design of controls at a point in time"
          />
          <RadioOption
            name="reportType"
            value="type2"
            checked={scope.reportType === 'type2'}
            onChange={() => onChange({ ...scope, reportType: 'type2' })}
            label="Type 2"
            description="Opinion on design and operating effectiveness over a period"
          />
        </div>
      </FormSection>

      <FormSection
        title="Trust Services Categories"
        description="Which categories are in scope? Security (Common Criteria) is always required."
      >
        <div className="space-y-2">
          <div className="p-3 bg-indigo-50 dark:bg-accent-500/10 rounded-lg border border-indigo-200 dark:border-accent-500/30">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="opacity-50" />
              <span className="font-medium text-indigo-700 dark:text-accent-400">
                Security (Common Criteria) - Required
              </span>
            </div>
            <p className="text-sm text-indigo-600 dark:text-accent-500 mt-1 ml-6">
              Protection against unauthorized access
            </p>
          </div>

          <CheckboxOption
            checked={scope.trustServiceCategories.availability}
            onChange={checked => onChange({
              ...scope,
              trustServiceCategories: { ...scope.trustServiceCategories, availability: checked }
            })}
            label="Availability"
            description="System is available for operation and use as committed"
          />
          <CheckboxOption
            checked={scope.trustServiceCategories.processingIntegrity}
            onChange={checked => onChange({
              ...scope,
              trustServiceCategories: { ...scope.trustServiceCategories, processingIntegrity: checked }
            })}
            label="Processing Integrity"
            description="System processing is complete, valid, accurate, timely, and authorized"
          />
          <CheckboxOption
            checked={scope.trustServiceCategories.confidentiality}
            onChange={checked => onChange({
              ...scope,
              trustServiceCategories: { ...scope.trustServiceCategories, confidentiality: checked }
            })}
            label="Confidentiality"
            description="Information designated as confidential is protected as committed"
          />
          <CheckboxOption
            checked={scope.trustServiceCategories.privacy}
            onChange={checked => onChange({
              ...scope,
              trustServiceCategories: { ...scope.trustServiceCategories, privacy: checked }
            })}
            label="Privacy"
            description="Personal information is collected, used, retained, disclosed, and disposed of properly"
          />
        </div>
      </FormSection>

      <FormSection
        title="System Description"
      >
        <textarea
          value={scope.systemDescription}
          onChange={e => onChange({ ...scope, systemDescription: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
          placeholder="Brief description of the system being assessed..."
        />
      </FormSection>

      <FormSection
        title="Additional Configuration"
      >
        <CheckboxOption
          checked={scope.complementaryUserEntityControls}
          onChange={checked => onChange({ ...scope, complementaryUserEntityControls: checked })}
          label="Complementary User Entity Controls (CUECs)"
          description="Report will include controls expected to be implemented by user entities"
        />
      </FormSection>
    </div>
  );
};

// ============================================
// ISO 27001 SCOPE FORM
// ============================================

const ISO27001ScopeForm: React.FC<{
  scope: ISO27001Scope;
  onChange: (scope: ISO27001Scope) => void;
}> = ({ scope, onChange }) => {
  return (
    <div className="space-y-6">
      <FormSection
        title="ISMS Scope Statement"
        description="Define the boundaries of your Information Security Management System"
      >
        <textarea
          value={scope.scopeStatement}
          onChange={e => onChange({ ...scope, scopeStatement: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
          placeholder="Describe the organizational units, locations, assets, and technology covered by the ISMS..."
        />
      </FormSection>

      <FormSection
        title="Statement of Applicability (SoA)"
        description="Document controls excluded from scope with justification"
      >
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Any control exclusions must be justified and documented. Exclusions will be reviewed during certification audit.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-steel-300 mb-2">
            Excluded Controls (comma-separated control IDs)
          </label>
          <input
            type="text"
            value={scope.excludedControls.join(', ')}
            onChange={e => onChange({
              ...scope,
              excludedControls: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
            placeholder="e.g., A.5.23, A.7.4, A.8.26"
          />
        </div>
      </FormSection>

      <FormSection
        title="Certification Body Requirements"
        description="Any specific requirements from your certification body"
      >
        <textarea
          value={scope.certificationBodyRequirements || ''}
          onChange={e => onChange({ ...scope, certificationBodyRequirements: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
          placeholder="Optional: specific auditor requirements or focus areas..."
        />
      </FormSection>
    </div>
  );
};

// ============================================
// NIST CSF SCOPE FORM
// ============================================

const NISTCSFScopeForm: React.FC<{
  scope: NISTCSFScope;
  onChange: (scope: NISTCSFScope) => void;
}> = ({ scope, onChange }) => {
  return (
    <div className="space-y-6">
      <FormSection
        title="Implementation Tier"
        description="What is your target implementation tier?"
      >
        <div className="space-y-2">
          <RadioOption
            name="tier"
            value="1"
            checked={scope.implementationTier === 1}
            onChange={() => onChange({ ...scope, implementationTier: 1 })}
            label="Tier 1: Partial"
            description="Risk management practices are not formalized; reactive approach"
          />
          <RadioOption
            name="tier"
            value="2"
            checked={scope.implementationTier === 2}
            onChange={() => onChange({ ...scope, implementationTier: 2 })}
            label="Tier 2: Risk Informed"
            description="Risk management practices approved but not organization-wide"
          />
          <RadioOption
            name="tier"
            value="3"
            checked={scope.implementationTier === 3}
            onChange={() => onChange({ ...scope, implementationTier: 3 })}
            label="Tier 3: Repeatable"
            description="Organization-wide risk management with regular updates"
          />
          <RadioOption
            name="tier"
            value="4"
            checked={scope.implementationTier === 4}
            onChange={() => onChange({ ...scope, implementationTier: 4 })}
            label="Tier 4: Adaptive"
            description="Continuous improvement and adaptation based on lessons learned"
          />
        </div>
      </FormSection>

      <FormSection
        title="Target Profile"
        description="Describe your target cybersecurity state"
      >
        <textarea
          value={scope.targetProfile}
          onChange={e => onChange({ ...scope, targetProfile: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
          placeholder="Describe the desired cybersecurity outcomes for your organization..."
        />
      </FormSection>

      <FormSection
        title="Current Profile (Optional)"
        description="Describe your current cybersecurity state for gap analysis"
      >
        <textarea
          value={scope.currentProfile || ''}
          onChange={e => onChange({ ...scope, currentProfile: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
          placeholder="Optional: describe your current cybersecurity posture..."
        />
      </FormSection>
    </div>
  );
};

// ============================================
// GDPR SCOPE FORM
// ============================================

const GDPRScopeForm: React.FC<{
  scope: GDPRScope;
  onChange: (scope: GDPRScope) => void;
}> = ({ scope, onChange }) => {
  return (
    <div className="space-y-6">
      <FormSection
        title="Role"
        description="What is your role regarding personal data?"
      >
        <div className="space-y-2">
          <RadioOption
            name="role"
            value="controller"
            checked={scope.controllerOrProcessor === 'controller'}
            onChange={() => onChange({ ...scope, controllerOrProcessor: 'controller' })}
            label="Data Controller"
            description="Determines the purposes and means of processing personal data"
          />
          <RadioOption
            name="role"
            value="processor"
            checked={scope.controllerOrProcessor === 'processor'}
            onChange={() => onChange({ ...scope, controllerOrProcessor: 'processor' })}
            label="Data Processor"
            description="Processes personal data on behalf of a controller"
          />
          <RadioOption
            name="role"
            value="joint_controller"
            checked={scope.controllerOrProcessor === 'joint_controller'}
            onChange={() => onChange({ ...scope, controllerOrProcessor: 'joint_controller' })}
            label="Joint Controller"
            description="Jointly determines purposes and means with another controller"
          />
        </div>
      </FormSection>

      <FormSection
        title="Territorial Scope"
      >
        <div className="space-y-2">
          <CheckboxOption
            checked={scope.establishedInEU}
            onChange={checked => onChange({ ...scope, establishedInEU: checked })}
            label="Established in the EU/EEA"
            description="Organization has an establishment in the European Union"
          />
          <CheckboxOption
            checked={scope.targetingEUResidents}
            onChange={checked => onChange({ ...scope, targetingEUResidents: checked })}
            label="Targeting EU/EEA residents"
            description="Offering goods/services to or monitoring behavior of EU residents"
          />
          <CheckboxOption
            checked={scope.crossBorderProcessing}
            onChange={checked => onChange({ ...scope, crossBorderProcessing: checked })}
            label="Cross-border processing"
            description="Processing activities in more than one EU member state"
          />
        </div>
      </FormSection>

      <FormSection
        title="Data Protection Officer (DPO)"
      >
        <div className="space-y-2">
          <CheckboxOption
            checked={scope.dpoRequired}
            onChange={checked => onChange({ ...scope, dpoRequired: checked })}
            label="DPO appointment required"
            description="Based on nature, scope, and type of processing activities"
          />
          {scope.dpoRequired && (
            <CheckboxOption
              checked={scope.dpoAppointed}
              onChange={checked => onChange({ ...scope, dpoAppointed: checked })}
              label="DPO has been appointed"
              description="A Data Protection Officer is designated"
            />
          )}
        </div>
      </FormSection>

      <FormSection
        title="Data Protection Impact Assessment"
      >
        <CheckboxOption
          checked={scope.dpiaRequired}
          onChange={checked => onChange({ ...scope, dpiaRequired: checked })}
          label="DPIA is required"
          description="Processing is likely to result in high risk to rights and freedoms"
        />
      </FormSection>

      {scope.crossBorderProcessing && scope.establishedInEU && (
        <FormSection
          title="Lead Supervisory Authority"
        >
          <input
            type="text"
            value={scope.leadSupervisoryAuthority || ''}
            onChange={e => onChange({ ...scope, leadSupervisoryAuthority: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-steel-700 bg-white dark:bg-steel-900 text-slate-900 dark:text-steel-100"
            placeholder="e.g., Irish Data Protection Commission, CNIL (France)"
          />
        </FormSection>
      )}
    </div>
  );
};

// ============================================
// DEFAULT SCOPE VALUES
// ============================================

function getDefaultScope(frameworkId: FrameworkId): FrameworkScope {
  switch (frameworkId) {
    case 'PCIDSS':
      return {
        frameworkId: 'PCIDSS',
        scope: {
          entityType: 'merchant',
          cdeDefinied: false,
          networkSegmented: false,
          segmentationValidated: false,
          channelsInScope: {
            ecommerce: false,
            moto: false,
            pos: false,
            cardPresent: false,
          },
          thirdPartyProcessing: false,
          tokenizationUsed: false,
          p2peValidated: false,
        },
      };
    case 'HIPAA':
      return {
        frameworkId: 'HIPAA',
        scope: {
          entityType: 'covered_entity',
          hybridEntity: false,
          ephiSystemsIdentified: false,
          businessAssociateAgreementsInPlace: false,
        },
      };
    case 'SOC2':
      return {
        frameworkId: 'SOC2',
        scope: {
          reportType: 'type2',
          trustServiceCategories: {
            security: true,
            availability: false,
            processingIntegrity: false,
            confidentiality: false,
            privacy: false,
          },
          systemDescription: '',
          subserviceOrganizations: [],
          complementaryUserEntityControls: false,
        },
      };
    case 'ISO27001':
      return {
        frameworkId: 'ISO27001',
        scope: {
          scopeStatement: '',
          excludedControls: [],
          exclusionJustifications: {},
        },
      };
    case 'NIST':
      return {
        frameworkId: 'NIST',
        scope: {
          implementationTier: 2,
          targetProfile: '',
          prioritizedSubcategories: [],
        },
      };
    case 'GDPR':
      return {
        frameworkId: 'GDPR',
        scope: {
          controllerOrProcessor: 'controller',
          establishedInEU: false,
          targetingEUResidents: false,
          dpoRequired: false,
          dpoAppointed: false,
          dpiaRequired: false,
          crossBorderProcessing: false,
        },
      };
  }
}

// ============================================
// MAIN FORM COMPONENT
// ============================================

export const FrameworkScopeForm: React.FC<FrameworkScopeFormProps> = ({
  frameworkId,
  existingScope,
  onSubmit,
  onBack,
}) => {
  const [scope, setScope] = useState<FrameworkScope>(
    existingScope || getDefaultScope(frameworkId)
  );

  const frameworkMeta = FRAMEWORKS.find(f => f.id === frameworkId);
  const color = FRAMEWORK_COLORS[frameworkId];

  const handleSubmit = () => {
    onSubmit(scope);
  };

  const renderForm = () => {
    switch (frameworkId) {
      case 'PCIDSS':
        return (
          <PCIDSSScopeForm
            scope={scope.scope as PCIDSSScope}
            onChange={s => setScope({ frameworkId: 'PCIDSS', scope: s })}
          />
        );
      case 'HIPAA':
        return (
          <HIPAAScopeForm
            scope={scope.scope as HIPAAScope}
            onChange={s => setScope({ frameworkId: 'HIPAA', scope: s })}
          />
        );
      case 'SOC2':
        return (
          <SOC2ScopeForm
            scope={scope.scope as SOC2Scope}
            onChange={s => setScope({ frameworkId: 'SOC2', scope: s })}
          />
        );
      case 'ISO27001':
        return (
          <ISO27001ScopeForm
            scope={scope.scope as ISO27001Scope}
            onChange={s => setScope({ frameworkId: 'ISO27001', scope: s })}
          />
        );
      case 'NIST':
        return (
          <NISTCSFScopeForm
            scope={scope.scope as NISTCSFScope}
            onChange={s => setScope({ frameworkId: 'NIST', scope: s })}
          />
        );
      case 'GDPR':
        return (
          <GDPRScopeForm
            scope={scope.scope as GDPRScope}
            onChange={s => setScope({ frameworkId: 'GDPR', scope: s })}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          {frameworkMeta?.icon}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-steel-100">
          Define {frameworkMeta?.name} Scope
        </h2>
        <p className="text-slate-600 dark:text-steel-400 mt-2">
          Answer these questions to customize the assessment for your organization
        </p>
      </div>

      <div className="bg-white dark:bg-steel-800 rounded-xl border border-slate-200 dark:border-steel-700 p-6">
        {renderForm()}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-steel-400 hover:text-slate-800 dark:hover:text-steel-200"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Continue to Assessment
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default FrameworkScopeForm;
