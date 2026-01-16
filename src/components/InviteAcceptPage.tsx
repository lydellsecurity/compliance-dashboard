/**
 * InviteAcceptPage Component
 *
 * Handles accepting organization invitations.
 * - Validates invite token from URL
 * - If user logged in: accept invite and redirect to app
 * - If not logged in: redirect to signup with invite context
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Loader2, UserPlus, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

interface InviteInfo {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: UserRole;
  invitedByName?: string;
  expiresAt: string;
}

type InviteStatus = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'accepting' | 'accepted' | 'error';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate invite token
  useEffect(() => {
    async function validateInvite() {
      if (!token || !isSupabaseConfigured() || !supabase) {
        setStatus('invalid');
        setError('Invalid invite link');
        return;
      }

      try {
        // Fetch invite details
        const { data: inviteData, error: inviteError } = await supabase
          .from('organization_invites')
          .select(`
            id,
            organization_id,
            email,
            role,
            expires_at,
            accepted_at,
            invited_by,
            organizations (name)
          `)
          .eq('token', token)
          .single();

        if (inviteError || !inviteData) {
          setStatus('invalid');
          setError('This invite link is not valid');
          return;
        }

        // Check if already accepted
        if (inviteData.accepted_at) {
          setStatus('used');
          setError('This invite has already been used');
          return;
        }

        // Check if expired
        if (new Date(inviteData.expires_at) < new Date()) {
          setStatus('expired');
          setError('This invite has expired');
          return;
        }

        // Get inviter name if available
        let inviterName = undefined;
        if (inviteData.invited_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', inviteData.invited_by)
            .single();
          inviterName = profile?.full_name || undefined;
        }

        setInvite({
          id: inviteData.id,
          organizationId: inviteData.organization_id,
          organizationName: (inviteData.organizations as any)?.name || 'Organization',
          email: inviteData.email,
          role: inviteData.role as UserRole,
          invitedByName: inviterName,
          expiresAt: inviteData.expires_at,
        });
        setStatus('valid');
      } catch (err) {
        console.error('Error validating invite:', err);
        setStatus('error');
        setError('Failed to validate invite');
      }
    }

    if (!authLoading) {
      validateInvite();
    }
  }, [token, authLoading]);

  // Accept invite function
  const acceptInvite = async () => {
    if (!user || !invite || !isSupabaseConfigured() || !supabase) return;

    setStatus('accepting');

    try {
      // Check if email matches
      if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        setStatus('error');
        setError(`This invite was sent to ${invite.email}. You are logged in as ${user.email}.`);
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', invite.organizationId)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        setStatus('error');
        setError('You are already a member of this organization');
        return;
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organizationId,
          user_id: user.id,
          role: invite.role,
          is_default: false,
        });

      if (memberError) {
        throw memberError;
      }

      // Mark invite as accepted
      await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      setStatus('accepted');

      // Redirect to app after delay
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invite:', err);
      setStatus('error');
      setError('Failed to accept invite. Please try again.');
    }
  };

  // Auto-accept if user is logged in with matching email
  useEffect(() => {
    if (status === 'valid' && user && invite && !authLoading) {
      if (user.email?.toLowerCase() === invite.email.toLowerCase()) {
        acceptInvite();
      }
    }
  }, [status, user, invite, authLoading]);

  // Loading state
  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Validating invite...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (status === 'invalid' || status === 'expired' || status === 'used' || status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-xl"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {status === 'expired' && 'Invite Expired'}
            {status === 'used' && 'Invite Already Used'}
            {(status === 'invalid' || status === 'error') && 'Invalid Invite'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // Accepting state
  if (status === 'accepting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-slate-700 dark:text-white">Joining {invite?.organizationName}...</p>
        </div>
      </div>
    );
  }

  // Accepted state
  if (status === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-xl"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to {invite?.organizationName}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            You've successfully joined as a <span className="font-medium capitalize">{invite?.role}</span>.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting to dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  // Valid invite - show accept options
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            You're Invited!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {invite?.invitedByName
              ? `${invite.invitedByName} has invited you to join`
              : 'You have been invited to join'}
          </p>
        </div>

        {/* Organization info */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {invite?.organizationName}
              </h3>
              <p className="text-sm text-slate-500">
                Role: <span className="capitalize">{invite?.role}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Invite email */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Mail className="w-4 h-4" />
          <span>Invite sent to: {invite?.email}</span>
        </div>

        {/* Actions */}
        {user ? (
          // User is logged in
          user.email?.toLowerCase() !== invite?.email.toLowerCase() ? (
            <div className="text-center">
              <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">
                This invite was sent to {invite?.email}. You are logged in as {user.email}.
              </p>
              <p className="text-slate-500 text-sm">
                Please sign out and sign in with the correct email to accept this invite.
              </p>
            </div>
          ) : (
            <button
              onClick={acceptInvite}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CheckCircle2 className="w-5 h-5" />
              Accept Invite
            </button>
          )
        ) : (
          // User is not logged in
          <div className="space-y-3">
            <Link
              to={`/signup?invite=${token}&email=${encodeURIComponent(invite?.email || '')}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Create Account & Join
            </Link>
            <Link
              to={`/login?invite=${token}&email=${encodeURIComponent(invite?.email || '')}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              <LogIn className="w-5 h-5" />
              Sign In & Join
            </Link>
          </div>
        )}

        {/* Expiry notice */}
        {invite?.expiresAt && (
          <p className="text-center text-xs text-slate-400 mt-4">
            This invite expires on {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default InviteAcceptPage;
