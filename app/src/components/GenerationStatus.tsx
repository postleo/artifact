import React from 'react';
import { PropItem } from '../types';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';

/**
 * Progressive generation feedback. Shows the current pipeline step while a prop is
 * actively generating (options or final assets), and a clear message on error/budget
 * states. Renders nothing once a stage is ready for the user (awaiting_review /
 * assets_ready / exported), so it never covers demo/placeholder art with fake status.
 */
export function GenerationStatus({ prop }: { prop?: PropItem | null }) {
  if (!prop) return null;
  const status = prop.status as string;
  const opts = prop.options || [];
  const hasRealOptions = opts.some(
    (o) => o.imageUrl && !o.imageUrl.startsWith('https://images.unsplash')
  );
  const fa: any = (prop as any).finalAssets || (prop as any).final_assets || {};
  const hasFinal = (fa.turnarounds || []).length > 0;

  let msg = '';
  let tone: 'work' | 'error' = 'work';

  if (status === 'generating' && hasRealOptions && !hasFinal) {
    msg = 'Generating final turnaround sheets and build assets for the selected option — this can take a couple of minutes.';
  } else if (status === 'generating') {
    msg = 'Analyzing the brief and generating divergent concept options — rendering real images now (about 20–40 seconds).';
  } else if (status === 'failed') {
    msg = 'Generation hit an error — most often the image-generation quota. It retries automatically; if it persists, try again shortly or request a Vertex AI image-quota increase.';
    tone = 'error';
  } else if (status === 'budget_exceeded') {
    msg = 'The prop reached its budget ceiling — approval is needed to continue generating.';
    tone = 'error';
  } else {
    return null; // awaiting_review / assets_ready / exported — nothing in-flight
  }

  const base =
    'mx-auto max-w-7xl mt-4 px-4 py-3 rounded-lg border flex items-center gap-3 text-sm font-mono-tag';
  const cls =
    tone === 'error'
      ? `${base} border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200`
      : `${base} border-[#12A79D]/40 bg-[#12A79D]/10 text-[#0B5F5A] dark:text-[#8fe9e1]`;

  return (
    <div className={cls} role="status" aria-live="polite">
      {tone === 'error' ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : hasRealOptions ? (
        <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
      ) : (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
      )}
      <span>{msg}</span>
    </div>
  );
}
