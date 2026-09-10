import React from 'react';
import { PropItem } from '../types';
import { Loader2, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

/**
 * PipelineProgress — a real, milestone-based 0–100% progress indicator for a
 * LIVE prop as it moves through the generation pipeline. It is honest: the
 * percentage reflects the actual pipeline status reported by the backend/agent
 * (there is no fabricated server-side percent), an animated spinner/pulse marks
 * when work is genuinely in flight, and error/budget states are surfaced plainly.
 *
 * Demo (sample archive) props are static showcases, so this renders nothing for
 * them — it never overlays a fake "in progress" state on demo content.
 */

const STEP_LABELS = ['Brief', 'Concept options', 'Selection', 'Final assets', 'Export'];

export function PipelineProgress({ prop }: { prop?: PropItem | null }) {
  if (!prop) return null;
  if (prop.source === 'demo') return null;

  const status = prop.status as string;
  const opts = prop.options || [];
  const hasRealOptions = opts.some(
    (o) => o.imageUrl && !o.imageUrl.startsWith('https://images.unsplash')
  );
  const fa: any = (prop as any).finalAssets || {};
  const hasFinal = (fa.turnarounds || []).length > 0;

  let step = 0;
  let percent = 0;
  let working = false;
  let tone: 'work' | 'error' | 'done' | 'wait' = 'work';
  let title = '';
  let message = '';

  if (status === 'failed') {
    tone = 'error';
    step = hasFinal ? 3 : hasRealOptions ? 2 : 1;
    percent = hasFinal ? 85 : hasRealOptions ? 55 : 20;
    title = 'Generation error';
    message =
      prop.pipelineError ||
      'Generation hit an error. It retries automatically — try again shortly if it keeps failing.';
  } else if (status === 'budget_exceeded') {
    tone = 'error';
    step = hasRealOptions ? 2 : 1;
    percent = hasRealOptions ? 55 : 20;
    title = 'Budget ceiling reached';
    message =
      prop.pipelineError ||
      'This prop reached its budget ceiling — approval is needed before it can keep generating.';
  } else if (status === 'exported') {
    tone = 'done';
    step = 4;
    percent = 100;
    title = 'Exported';
    message = 'The finished package has been sent to the asset library.';
  } else if (status === 'assets_ready') {
    tone = 'done';
    step = 4;
    percent = 90;
    title = 'Final assets ready';
    message = 'Turnarounds and build specs are ready. Review the dossier below, then export.';
  } else if (status === 'generating' && hasRealOptions && !hasFinal) {
    working = true;
    step = 3;
    percent = 72;
    title = 'Building final assets';
    message =
      'Rendering turnaround sheets and fabrication specs for the selected option — this can take a couple of minutes.';
  } else if (status === 'generating') {
    working = true;
    step = 1;
    percent = 22;
    title = 'Generating concept options';
    message =
      'Analyzing the brief and rendering divergent concept images — usually about 20–40 seconds.';
  } else if (status === 'awaiting_review') {
    tone = 'wait';
    step = 2;
    percent = 45;
    title = hasRealOptions ? 'Concept options ready' : 'Options ready for review';
    message = hasRealOptions
      ? 'Choose a direction to continue to selection.'
      : 'Awaiting your review.';
  } else {
    return null;
  }

  // A soft error (e.g. selection failed to record) on an otherwise non-error
  // status should still be surfaced clearly.
  if (tone !== 'error' && prop.pipelineError) {
    tone = 'error';
    title = 'Action needed';
    message = prop.pipelineError;
  }

  const barColor =
    tone === 'error' ? 'bg-amber-500' : tone === 'done' ? 'bg-[#0B5F5A]' : 'bg-[#12A79D]';
  const wrapCls =
    tone === 'error'
      ? 'border-amber-500/40 bg-amber-500/10'
      : tone === 'done'
      ? 'border-[#0B5F5A]/30 bg-[#0B5F5A]/5'
      : 'border-[#12A79D]/40 bg-[#12A79D]/5';

  return (
    <div className={`mx-auto max-w-7xl mt-4 px-4 py-3 border ${wrapCls}`} role="status" aria-live="polite">
      {/* Header: icon + title + percent */}
      <div className="flex items-center gap-2.5 mb-2">
        {tone === 'error' ? (
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
        ) : tone === 'done' ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0B5F5A]" />
        ) : working ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#12A79D]" />
        ) : (
          <Circle className="w-4 h-4 shrink-0 text-[#12A79D]" />
        )}
        <span className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3]">
          {title}
        </span>
        <span className="ml-auto font-mono-tag text-xs font-bold text-[#48605E] dark:text-[#8BA4A1]">
          {percent}%
        </span>
      </div>

      {/* Progress bar (solid fill; subtle pulse overlay only while actively working) */}
      <div className="h-2 w-full bg-[#D8E5E1] dark:bg-[#223735] overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-700 ease-out relative`}
          style={{ width: `${percent}%` }}
        >
          {working && <span className="absolute inset-0 bg-white/30 animate-pulse" />}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mt-2.5 gap-1">
        {STEP_LABELS.map((label, i) => {
          const state =
            i < step ? 'done' : i === step ? (tone === 'error' ? 'error' : 'active') : 'todo';
          return (
            <div key={label} className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  state === 'done'
                    ? 'bg-[#0B5F5A]'
                    : state === 'active'
                    ? 'bg-[#12A79D]'
                    : state === 'error'
                    ? 'bg-amber-500'
                    : 'bg-[#D8E5E1] dark:bg-[#223735]'
                }`}
              />
              <span
                className={`font-mono-tag text-[10px] uppercase tracking-wider truncate ${
                  state === 'todo'
                    ? 'text-[#48605E]/60 dark:text-[#8BA4A1]/60'
                    : 'text-[#12201F] dark:text-[#EDF5F3]'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Message */}
      <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mt-2 leading-relaxed">
        {message}
      </p>
    </div>
  );
}
