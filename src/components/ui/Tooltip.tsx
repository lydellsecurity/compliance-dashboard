/**
 * Tooltip primitive.
 *
 * Minimal, a11y-correct tooltip: `aria-describedby` links the trigger to the
 * tooltip content, keyboard focus opens it, ESC closes, and it sits above
 * modal base (z-command-palette tier) so jargon in upgrade modals stays
 * explainable.
 *
 * Also exports `<GlossaryTerm>` — a domain-terms helper pre-wired with the
 * compliance acronyms that appear across the app (SSO, SAML, SCIM, MFA,
 * RBAC). Definitions live in one place so copy stays consistent.
 */

import React, { useId, useRef, useState, useEffect } from 'react';

// ============================================================================
// TOOLTIP
// ============================================================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  /** 'top' (default) | 'bottom' | 'left' | 'right' */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing, ms. Prevents flicker on fast hovers. */
  openDelayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  openDelayMs = 200,
}) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<number | null>(null);

  const cancel = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const show = () => {
    cancel();
    timer.current = window.setTimeout(() => setOpen(true), openDelayMs);
  };
  const hide = () => {
    cancel();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  const child = React.cloneElement(children, {
    'aria-describedby': open ? id : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <span className="relative inline-flex">
      {child}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute ${positionClass} z-[80] px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-steel-100 dark:text-slate-900 shadow-lg max-w-xs whitespace-normal pointer-events-none`}
        >
          {content}
        </span>
      )}
    </span>
  );
};

// ============================================================================
// GLOSSARY
// ============================================================================

/**
 * Compliance jargon definitions. Written for a "smart generalist who's seen
 * the term on a SaaS pricing page but can't define it" audience. Keep
 * definitions one short sentence; deeper explanation belongs in docs.
 */
export const GLOSSARY: Record<string, { term: string; definition: string }> = {
  sso: {
    term: 'SSO',
    definition:
      'Single Sign-On. Let employees log in with their work account (Okta, Google, Azure AD) instead of a separate AttestAI password.',
  },
  saml: {
    term: 'SAML',
    definition:
      'The open standard that SSO runs on. If your IT team asks "do you support SAML?", that means SSO.',
  },
  scim: {
    term: 'SCIM',
    definition:
      'Automatically creates, updates, and deactivates AttestAI users when your identity provider changes them — no manual off-boarding.',
  },
  mfa: {
    term: 'MFA',
    definition:
      'Multi-Factor Authentication. Requires a second proof beyond a password (code, biometric, hardware key) to log in.',
  },
  rbac: {
    term: 'RBAC',
    definition:
      'Role-Based Access Control. Permissions attach to roles (Admin, Auditor, Viewer) rather than individuals, so you manage access by role.',
  },
  soc2: {
    term: 'SOC 2',
    definition:
      'AICPA audit of your security, availability, and confidentiality controls. The default framework for B2B SaaS.',
  },
  iso27001: {
    term: 'ISO 27001',
    definition:
      'International standard for Information Security Management Systems. Preferred in Europe and for global enterprise deals.',
  },
  hipaa: {
    term: 'HIPAA',
    definition:
      'US healthcare data protection law. Required if you store or process Protected Health Information (PHI).',
  },
  pcidss: {
    term: 'PCI DSS',
    definition:
      'Payment Card Industry Data Security Standard. Required if you handle credit card data.',
  },
  gdpr: {
    term: 'GDPR',
    definition:
      'EU General Data Protection Regulation. Required for any product used by EU residents, regardless of where you are.',
  },
};

interface GlossaryTermProps {
  /** Lowercased glossary key. */
  termKey: keyof typeof GLOSSARY;
  /** Override the displayed term (for capitalization or alt forms). */
  display?: string;
  /** Render inline text with a subtle underline rather than a standalone token. */
  children?: React.ReactNode;
}

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ termKey, display, children }) => {
  const entry = GLOSSARY[termKey];
  if (!entry) return <>{children ?? display ?? termKey}</>;

  return (
    <Tooltip content={entry.definition}>
      <span
        tabIndex={0}
        className="underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded"
      >
        {children ?? display ?? entry.term}
      </span>
    </Tooltip>
  );
};
