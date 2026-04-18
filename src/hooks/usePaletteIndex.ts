/**
 * usePaletteIndex
 *
 * Lightweight index of vendors + evidence for the command palette. Fetches
 * *minimal* metadata (id + display name) rather than pulling the full records
 * that the per-tab stores own. Keeps the palette snappy without requiring a
 * larger refactor to hoist the full stores into global state.
 *
 * Refreshes on mount and when `organizationId` changes. The palette doesn't
 * need real-time freshness — a 30s stale window is fine.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  SearchableVendor,
  SearchableEvidence,
} from '../components/ui/CommandPalette';

const STALE_MS = 30_000;

interface PaletteIndex {
  vendors: SearchableVendor[];
  evidence: SearchableEvidence[];
}

let cache: { org: string; fetchedAt: number; data: PaletteIndex } | null = null;

export function usePaletteIndex(organizationId: string | undefined): PaletteIndex {
  const [data, setData] = useState<PaletteIndex>(() => {
    if (cache && cache.org === organizationId && Date.now() - cache.fetchedAt < STALE_MS) {
      return cache.data;
    }
    return { vendors: [], evidence: [] };
  });

  useEffect(() => {
    if (!organizationId || !supabase) return;
    const client = supabase;
    let cancelled = false;

    const fetchIndex = async () => {
      try {
        // Pull only the columns the palette needs — not the full rows. Caps
        // at 200 of each to keep initial load fast; more than that is
        // overkill for keyboard search.
        const [vendorRes, evidenceRes] = await Promise.all([
          client
            .from('vendors')
            .select('id, name, category')
            .eq('organization_id', organizationId)
            .limit(200),
          client
            .from('evidence_items')
            .select('id, title, control_id')
            .eq('organization_id', organizationId)
            .limit(200),
        ]);

        if (cancelled) return;

        const vendors: SearchableVendor[] = (vendorRes.data ?? []).map((v) => ({
          id: (v as { id: string }).id,
          name: (v as { name: string }).name,
          category: (v as { category?: string }).category,
        }));
        const evidence: SearchableEvidence[] = (evidenceRes.data ?? []).map((e) => ({
          id: (e as { id: string }).id,
          title: (e as { title: string }).title,
          controlId: (e as { control_id?: string | null }).control_id ?? null,
        }));

        const next = { vendors, evidence };
        cache = { org: organizationId, fetchedAt: Date.now(), data: next };
        setData(next);
      } catch {
        // Palette index fetching is best-effort. A failure just leaves the
        // palette with navigation + controls, which still works.
      }
    };

    fetchIndex();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return data;
}
