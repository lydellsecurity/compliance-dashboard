/**
 * TrustCenterTokenManager Component
 *
 * Manages shareable Trust Center access links (tokens).
 * Features:
 * - Create new access tokens with optional expiration
 * - Copy shareable link to clipboard
 * - View/revoke existing tokens
 * - View count analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Plus, Copy, Check, Trash2, Eye, Clock,
  Calendar, AlertCircle, X, ExternalLink, Shield,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import type { TrustCenterToken } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

interface TokenInfo extends TrustCenterToken {
  shareableUrl: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// @ts-expect-error formatDateTime kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

// Copy button with feedback
const CopyButton: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        copied
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy
        </>
      )}
    </button>
  );
};

// Create Token Modal
const CreateTokenModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreated: (token: TokenInfo) => void;
  organizationId: string;
  organizationSlug: string;
}> = ({ isOpen, onClose, onCreated, organizationId, organizationSlug }) => {
  const [name, setName] = useState('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setError('Database not configured');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const token = generateToken();
      const expiresAt = hasExpiration
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error: insertError } = await supabase
        .from('trust_center_tokens')
        .insert({
          organization_id: organizationId,
          token,
          name: name.trim() || null,
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const baseUrl = window.location.origin;
      const shareableUrl = `${baseUrl}/trust/${organizationSlug}?token=${token}`;

      onCreated({ ...data, shareableUrl });
      onClose();
      setName('');
      setHasExpiration(false);
      setExpirationDays(30);
    } catch (err) {
      console.error('Error creating token:', err);
      setError('Failed to create access link');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Access Link</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Link Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Client ABC Portal, Investor Link"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExpiration}
                onChange={(e) => setHasExpiration(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Set expiration date
              </span>
            </label>
            {hasExpiration && (
              <div className="mt-2 pl-6">
                <select
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Link
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Token Row
const TokenRow: React.FC<{
  token: TokenInfo;
  onRevoke: (id: string) => void;
}> = ({ token, onRevoke }) => {
  const [revoking, setRevoking] = useState(false);

  const isExpired = token.expires_at && new Date(token.expires_at) < new Date();
  const isActive = token.is_active && !isExpired;

  const handleRevoke = async () => {
    setRevoking(true);
    await onRevoke(token.id);
    setRevoking(false);
  };

  return (
    <div className={`p-4 border-b border-slate-200 dark:border-slate-700 last:border-0 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-white truncate">
              {token.name || 'Unnamed Link'}
            </span>
            {!isActive && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {isExpired ? 'Expired' : 'Revoked'}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 font-mono truncate">
            {token.shareableUrl}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {token.view_count} views
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Created {formatDate(token.created_at)}
            </span>
            {token.expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {isExpired ? 'Expired' : `Expires ${formatDate(token.expires_at)}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={token.shareableUrl} />
          <a
            href={token.shareableUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {isActive && (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Revoke link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TrustCenterTokenManager: React.FC = () => {
  const { currentOrg } = useOrganization();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch tokens
  const fetchTokens = useCallback(async () => {
    if (!currentOrg || !isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trust_center_tokens')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const baseUrl = window.location.origin;
      const tokensWithUrls = (data || []).map(t => ({
        ...t,
        shareableUrl: `${baseUrl}/trust/${currentOrg.slug}?token=${t.token}`,
      }));

      setTokens(tokensWithUrls);
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Revoke token
  const handleRevoke = async (tokenId: string) => {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      await supabase
        .from('trust_center_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      setTokens(prev =>
        prev.map(t => (t.id === tokenId ? { ...t, is_active: false } : t))
      );
    } catch (err) {
      console.error('Error revoking token:', err);
    }
  };

  // Token created
  const handleTokenCreated = (newToken: TokenInfo) => {
    setTokens(prev => [newToken, ...prev]);
  };

  if (!currentOrg) {
    return (
      <Card className="p-6 text-center">
        <p className="text-slate-500">Please select an organization to manage Trust Center links.</p>
      </Card>
    );
  }

  const activeTokens = tokens.filter(t => t.is_active && (!t.expires_at || new Date(t.expires_at) > new Date()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trust Center Links</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create shareable links for your Trust Center. Each link can be tracked and revoked.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeTokens.length}</p>
              <p className="text-sm text-slate-500">Active Links</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {tokens.reduce((sum, t) => sum + (t.view_count || 0), 0)}
              </p>
              <p className="text-sm text-slate-500">Total Views</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{tokens.length}</p>
              <p className="text-sm text-slate-500">Total Links</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tokens List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-500">Loading links...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center">
            <Link2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">No access links yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Create your first Trust Center link to share with clients or partners.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {tokens.map(token => (
              <TokenRow key={token.id} token={token} onRevoke={handleRevoke} />
            ))}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTokenModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleTokenCreated}
            organizationId={currentOrg.id}
            organizationSlug={currentOrg.slug}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrustCenterTokenManager;
