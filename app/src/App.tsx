import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, PropItem, ProductionProfile, PropViewMode, HistoryLogEntry } from './types';
import { INITIAL_PROPS } from './data/propsData';
import { Header } from './components/Header';
import { CataloguePage } from './components/pages/CataloguePage';
import { BriefPage } from './components/pages/BriefPage';
import { ProofSheetPage } from './components/pages/ProofSheetPage';
import { SelectionPage } from './components/pages/SelectionPage';
import { DossierPage } from './components/pages/DossierPage';
import { RegistryPage } from './components/pages/RegistryPage';
import { OnboardingModal } from './components/OnboardingModal';
import { PipelineProgress } from './components/PipelineProgress';
import { getStudioProfile, saveStudioProfile, getStudioProps, saveStudioProps, createProp, getProp, getLiveProps, deleteLiveProp, selectPropOption, finalizeProp, exportProp } from './services/studioApi';
import { isAuthenticated } from './services/auth';
import { LoginScreen } from './components/LoginScreen';
import { Sparkles, Layers } from 'lucide-react';

// The sample archive, tagged as demo so the UI keeps its rich showcase content
// while never letting it bleed into real, live-generated props.
const DEMO_PROPS: PropItem[] = INITIAL_PROPS.map((p) => ({ ...p, source: 'demo' as const }));

// A prop is "live" when it was created through the real generation pipeline.
// New live props carry source: 'live'; for older persisted records that predate
// the flag we fall back to the agent's id shape (prop_<hex>). Demo is explicit.
function isLiveProp(p: { id: string; source?: string } | null | undefined): boolean {
  if (!p) return false;
  if (p.source === 'live') return true;
  if (p.source === 'demo') return false;
  return p.id.startsWith('prop_');
}

// Real option images are hosted (GCS signed URLs / agent output); the unsplash
// domain is only ever used as a placeholder fallback, so it means "not real yet".
function hasRealOptionImages(prop: PropItem): boolean {
  return (prop.options || []).some(
    (o) => !!o.imageUrl && !o.imageUrl.startsWith('https://images.unsplash')
  );
}

// Map a backend mirror record (app_props / GET /api/props) into the PropItem shape
// the studio UI uses. The backend already maps options/final_assets into the app
// shape during sync; here we just normalise field names and derive display fields.
function mapMirrorToPropItem(raw: any): PropItem {
  const opts: any[] = Array.isArray(raw.options) ? raw.options : [];
  const brief = raw.brief || {};
  const selectedId: string | undefined = raw.selection?.chosen || raw.selectedOptionId;
  const isReal = (o: any) => o?.imageUrl && !String(o.imageUrl).startsWith('https://images.unsplash');
  const selOpt = selectedId ? opts.find((o) => o.id === selectedId) : undefined;
  const thumb = isReal(selOpt) ? selOpt.imageUrl : (opts.find(isReal)?.imageUrl || '');
  return {
    id: raw.id,
    name: raw.name || brief.what || 'Hero Prop',
    source: 'live',
    status: (raw.status || 'generating') as PropItem['status'],
    shortDescription: raw.shortDescription || raw.description || '',
    world: raw.world || '',
    era: raw.era || brief.era || '',
    functionOnScreen:
      raw.functionOnScreen || (Array.isArray(brief.on_screen) ? brief.on_screen.join('; ') : ''),
    constraints:
      raw.constraints || (Array.isArray(brief.constraints) ? brief.constraints.join('; ') : ''),
    optionsCount: opts.length || raw.optionsCount || 3,
    thumbnailUrl: thumb,
    referenceImages: [],
    options: opts,
    selectedOptionId: selectedId,
    finalAssets: raw.finalAssets || raw.final_assets || undefined,
    costEstUsd: raw.cost?.est_usd ? Math.round(raw.cost.est_usd) : 0,
    timeEstDays: 0,
    selectionSynced: !!(raw.selection || raw.selectedOptionId),
    pipelineError: pipelineErrorFor(raw.status),
  } as PropItem;
}

// Honest, plain-language message for a terminal/blocked pipeline status.
// Returns undefined for healthy statuses so any prior error is cleared.
function pipelineErrorFor(status: string | undefined): string | undefined {
  if (status === 'failed') {
    return 'Generation hit an error — most often the image-generation quota. It retries automatically; if it keeps failing, try again shortly.';
  }
  if (status === 'budget_exceeded') {
    return 'This prop reached its budget ceiling — approval is needed before it can keep generating.';
  }
  return undefined;
}

export default function App() {
  // Production profile — loaded from the backend DB on mount (see effect below).
  const DEFAULT_PROFILE: ProductionProfile = {
    projectName: 'Chronicles of Aethelgard',
    worldLore: 'Steampunk / Gilded Age of Drift',
    departmentRole: 'Lead Prop Master',
    leadName: 'Isla Venn',
    startMode: 'scratch'
  };
  const [productionProfile, setProductionProfile] = useState<ProductionProfile>(DEFAULT_PROFILE);

  // Onboarding modal visibility — opened after load if no profile exists in the DB.
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // True while the initial studio state is being fetched from the backend.
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Props list: persisted in the backend DB (loaded on mount).
  const [propsList, setPropsList] = useState<PropItem[]>([]);

  const [activePropId, setActivePropId] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<ActiveTab>('catalogue');

  // Auth gate: user must log in (password -> backend JWT) before using the studio.
  const [authed, setAuthed] = useState<boolean>(() => isAuthenticated());

  // If any API call gets a 401, the auth service clears the token and fires this
  // event; drop back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener('artifact-unauthorized', onUnauthorized);
    return () => window.removeEventListener('artifact-unauthorized', onUnauthorized);
  }, []);

  // Guards the auto-save safety net below: false until the initial load finishes,
  // so we never persist the pre-load empty slate over real stored data.
  const hydratedRef = useRef<boolean>(false);

  // Load persisted studio state (profile + props) from the backend DB on mount
  // (only once authenticated).
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    hydratedRef.current = false; // disable auto-save while (re)loading
    (async () => {
      try {
        // Load the profile, the saved slate, and the authoritative live-prop mirror.
        // Live props are sourced from the mirror (GET /api/props) so every generation
        // created through the pipeline always appears — independent of the browser
        // slate. The saved slate contributes demo props + ordering/UI-only records.
        const [profile, slate, liveRaw] = await Promise.all([
          getStudioProfile(),
          getStudioProps().catch(() => [] as PropItem[]),
          getLiveProps().catch(() => [] as any[]),
        ]);
        if (cancelled) return;
        if (profile) {
          setProductionProfile(profile);
        } else {
          // First run — no profile persisted yet: prompt onboarding.
          setIsOnboardingOpen(true);
        }

        const live: PropItem[] = (Array.isArray(liveRaw) ? liveRaw : []).map(mapMirrorToPropItem);
        // Merge: keep the saved slate (demo props + any local records), then overlay
        // the authoritative live props (added or refreshed). Dedupe by id, live wins.
        const byId = new Map<string, PropItem>();
        for (const p of Array.isArray(slate) ? slate : []) byId.set(p.id, p);
        for (const p of live) byId.set(p.id, p);
        const merged = Array.from(byId.values());
        // Show live props first (newest work), demo/sample archive after.
        merged.sort((a, b) => (a.source === 'demo' ? 1 : 0) - (b.source === 'demo' ? 1 : 0));

        if (merged.length > 0) {
          setPropsList(merged);
          setActivePropId(merged[0].id);
          // Reconcile the persisted slate so the recovered props are saved back too.
          void saveStudioProps(merged);
        }
      } catch (e) {
        console.error('Failed to load studio state from backend:', e);
      } finally {
        if (!cancelled) {
          hydratedRef.current = true; // load done → auto-save may persist changes
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  // Auto-save safety net: whenever the props slate changes after the initial load,
  // persist it (debounced). The per-action saves already fire immediately; this is
  // a backstop so a new generation can never be lost to a missed/raced save.
  useEffect(() => {
    if (!authed || !hydratedRef.current) return;
    const t = setTimeout(() => {
      void saveStudioProps(propsList);
    }, 700);
    return () => clearTimeout(t);
  }, [propsList, authed]);

  // Dual view mode: 'vitrine' (museum showcase) vs 'photo_artifact' (clean production photo)
  const [viewMode, setViewMode] = useState<PropViewMode>(() => {
    const saved = localStorage.getItem('artifact_view_mode');
    return saved === 'photo_artifact' || saved === 'vitrine' ? saved : 'vitrine';
  });

  const handleViewModeChange = (mode: PropViewMode) => {
    setViewMode(mode);
    localStorage.setItem('artifact_view_mode', mode);
  };

  // Dark scheme by default, with light mode toggle
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('artifact_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('artifact_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const activeProp = propsList.find((p) => p.id === activePropId) || (propsList.length > 0 ? propsList[0] : null);

  const handleSelectProp = (prop: PropItem) => {
    setActivePropId(prop.id);
    if (prop.status === 'assets_ready' || prop.status === 'exported') {
      setCurrentTab('dossier');
    } else if (prop.status === 'awaiting_review') {
      setCurrentTab('options');
    } else {
      setCurrentTab('options');
    }
  };

  const handleNewProp = () => {
    setCurrentTab('brief');
  };

  const handleCompleteOnboarding = (profile: ProductionProfile) => {
    setProductionProfile(profile);
    void saveStudioProfile(profile);
    setIsOnboardingOpen(false);

    if (profile.startMode === 'scratch') {
      setPropsList([]);
      void saveStudioProps([]);
      setCurrentTab('catalogue');
    } else {
      setPropsList(DEMO_PROPS);
      void saveStudioProps(DEMO_PROPS);
      setActivePropId('ARF-00123');
      setCurrentTab('catalogue');
    }
  };

  const handleResetToDemo = () => {
    setPropsList(DEMO_PROPS);
    void saveStudioProps(DEMO_PROPS);
    setActivePropId('ARF-00123');
    setCurrentTab('catalogue');
  };

  // Poll the backend for the REAL agent-generated options + images and merge them
  // into the prop as they arrive (the backend refreshes from the agent on read).
  const pollPropUntilReady = async (id: string) => {
    const terminal = ['assets_ready', 'exported', 'failed', 'budget_exceeded'];
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
      let live: any = null;
      try {
        live = await getProp(id);
      } catch {
        continue;
      }
      if (!live) continue;
      const hasOptions =
        Array.isArray(live.options) && live.options.length > 0 && !!live.options[0]?.imageUrl;
      const firstImg: string = hasOptions ? live.options[0].imageUrl : '';
      // The agent returns placeholder (unsplash) URLs until the real images land.
      const hasRealImg = !!firstImg && !firstImg.startsWith('https://images.unsplash');
      const status = live.status as PropItem['status'] | undefined;
      const errText = pipelineErrorFor(status);
      setPropsList((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: status || p.status,
            // Only ever adopt REAL options (with real images); never let the
            // agent's placeholder art land on a live prop.
            options: hasRealImg ? live.options : p.options,
            thumbnailUrl: hasRealImg ? live.options[0].imageUrl : p.thumbnailUrl,
            finalAssets:
              live.final_assets && live.final_assets.turnarounds?.length
                ? live.final_assets
                : p.finalAssets,
            costEstUsd: live.cost?.est_usd ? Math.round(live.cost.est_usd) : p.costEstUsd,
            pipelineError: errText,
          } as PropItem;
        });
        void saveStudioProps(next);
        return next;
      });
      if (hasRealImg || (status && terminal.includes(status))) break;
    }
  };

  // Poll for Stage 3 final assets (turnarounds/callouts) after finalize is kicked off.
  const pollFinalUntilReady = async (id: string) => {
    const terminal = ['assets_ready', 'exported', 'failed', 'budget_exceeded'];
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 6000));
      let live: any = null;
      try { live = await getProp(id); } catch { continue; }
      if (!live) continue;
      const fa = live.final_assets || {};
      const hasFinal = Array.isArray(fa.turnarounds) && fa.turnarounds.length > 0;
      const status = live.status as PropItem['status'] | undefined;
      const errText = pipelineErrorFor(status);
      setPropsList((prev) => {
        const next = prev.map((p) =>
          p.id === id
            ? ({
                ...p,
                status: status || p.status,
                finalAssets: hasFinal ? fa : p.finalAssets,
                costEstUsd: live.cost?.est_usd ? Math.round(live.cost.est_usd) : p.costEstUsd,
                pipelineError: errText,
              } as PropItem)
            : p
        );
        void saveStudioProps(next);
        return next;
      });
      if (status && terminal.includes(status)) break;
    }
  };

  const handleSubmitBrief = async (newBriefData: Partial<PropItem>) => {
    // Kick off the REAL agent pipeline (backend -> agent -> Agent Engine -> Nano Banana).
    // A live prop starts EMPTY: no demo options, decision, assets, or history are
    // fabricated. The poller fills in real options + images as the agent produces
    // them, and PipelineProgress communicates 0-100% progress. If creation cannot
    // reach the pipeline, we record an honest failed prop instead of faking one.
    let newId = `ARF-LOCAL-${Date.now()}`;
    let liveCreated = false;
    let createError = '';
    try {
      const created: any = await createProp({
        name: newBriefData.name || 'Untitled Hero Prop',
        shortDescription: newBriefData.shortDescription,
        world: newBriefData.world,
        era: newBriefData.era,
        functionOnScreen: newBriefData.functionOnScreen,
        constraints: newBriefData.constraints,
        optionsCount: newBriefData.optionsCount,
      });
      if (created && created.id) {
        newId = created.id;
        liveCreated = true;
      } else {
        createError = 'The generation service did not return a prop id.';
      }
    } catch (e) {
      console.error('Live prop creation failed:', e);
      createError = 'Could not reach the generation service to start this prop.';
    }

    const stamp = `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const leadName = productionProfile.leadName || 'Studio';
    const leadRole = productionProfile.departmentRole || 'Prop Master';

    const history: HistoryLogEntry[] = [
      {
        id: `hist-${Date.now()}-1`,
        timestamp: stamp,
        action: newBriefData.scriptExcerpt
          ? 'Hero Prop Brief Extracted from Production Script'
          : 'Hero Prop Brief Submitted',
        user: leadName,
        role: leadRole,
        notes: `Brief submitted for ${newBriefData.name || 'the hero prop'}.`,
        type: 'creation',
      },
    ];
    if (liveCreated) {
      history.push({
        id: `hist-${Date.now()}-2`,
        timestamp: stamp,
        action: 'Concept Option Generation Started',
        user: 'Artifact Agent',
        role: 'Generation Pipeline',
        notes: `Requested ${newBriefData.optionsCount || 3} divergent concept directions.`,
        type: 'generation',
      });
    }

    const newProp: PropItem = {
      id: newId,
      name: newBriefData.name || 'Untitled Hero Prop',
      source: 'live',
      status: liveCreated ? 'generating' : 'failed',
      pipelineError: liveCreated ? undefined : (createError || 'Prop creation failed.'),
      shortDescription: newBriefData.shortDescription || '',
      world: newBriefData.world || productionProfile.projectName || '',
      era: newBriefData.era || productionProfile.worldLore || '',
      functionOnScreen: newBriefData.functionOnScreen || '',
      constraints: newBriefData.constraints || '',
      optionsCount: newBriefData.optionsCount || 3,
      thumbnailUrl: '',
      costEstUsd: 0,
      timeEstDays: 0,
      referenceImages: newBriefData.referenceImages || [],
      options: [],
      selectionSynced: false,
      sceneNumber: newBriefData.sceneNumber,
      scriptExcerpt: newBriefData.scriptExcerpt,
      history,
    };

    const updated = [newProp, ...propsList];
    setPropsList(updated);
    void saveStudioProps(updated);
    setActivePropId(newId);
    // On success, go to the proof sheet (which shows the generating state);
    // on failure, return to the catalogue where the failed card is visible.
    setCurrentTab(liveCreated ? 'options' : 'catalogue');

    // When the real agent pipeline is running, poll for generated options + images.
    if (liveCreated) {
      void pollPropUntilReady(newId);
    }
  };

  const handleUpdateProp = (updatedProp: PropItem) => {
    const updated = propsList.map((p) => (p.id === updatedProp.id ? updatedProp : p));
    setPropsList(updated);
    void saveStudioProps(updated);
  };

  const handleSelectOptionInProofSheet = (optionId: string, notes: string) => {
    if (!activeProp) return;
    const live = isLiveProp(activeProp);
    const chosen = activeProp.options.find((o) => o.id === optionId);
    const updated = propsList.map((p) => {
      if (p.id !== activeProp.id) return p;
      return {
        ...p,
        selectedOptionId: optionId,
        status: 'awaiting_review' as const,
        // Catalogue thumbnail now follows the chosen option's image once one is
        // selected (falls back to whatever it was — the first/random image — when
        // nothing is selected yet).
        thumbnailUrl:
          chosen?.imageUrl && !chosen.imageUrl.startsWith('https://images.unsplash')
            ? chosen.imageUrl
            : p.thumbnailUrl,
        // For live props the selection isn't confirmed with the agent until the
        // request below succeeds; the Build button stays disabled until then.
        selectionSynced: live ? false : true,
        pipelineError: undefined,
        decision: {
          optionId,
          whyWeChoseThis:
            notes ||
            chosen?.rationale ||
            'Selected as the strongest direction for this hero prop.',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          // Live props record the real person who made the call — no fabricated
          // approval panel. Demo props keep their showcase approver list.
          approvers: live
            ? [{ name: productionProfile.leadName || 'Studio', role: productionProfile.departmentRole || 'Prop Master', avatar: '' }]
            : (p.decision?.approvers || []),
          notes: notes ? [notes] : (live ? [] : (p.decision?.notes || [])),
        },
      } as PropItem;
    });
    setPropsList(updated);
    void saveStudioProps(updated);
    setCurrentTab('selection');
    // Gate 2: record the selection with the real agent for live props, then flip
    // selectionSynced so final-asset generation can be started.
    if (live) {
      const id = activeProp.id;
      selectPropOption(id, optionId, notes)
        .then(() => {
          setPropsList((prev) => {
            const next = prev.map((p) =>
              p.id === id ? ({ ...p, selectionSynced: true, pipelineError: undefined } as PropItem) : p
            );
            void saveStudioProps(next);
            return next;
          });
        })
        .catch((e) => {
          console.error('selection sync failed', e);
          setPropsList((prev) => {
            const next = prev.map((p) =>
              p.id === id
                ? ({ ...p, selectionSynced: false, pipelineError: 'Could not record your selection with the generation service. Please try again.' } as PropItem)
                : p
            );
            void saveStudioProps(next);
            return next;
          });
        });
    }
  };

  const handleBuildFinalAssets = () => {
    if (!activeProp) return;
    const live = isLiveProp(activeProp);
    const updated = propsList.map((p) => {
      if (p.id !== activeProp.id) return p;
      // Live props: mark generating and let the agent produce real final assets
      // (polled in). Demo props: keep the instant local showcase assets.
      return {
        ...p,
        status: (live ? 'generating' : 'assets_ready') as PropItem['status'],
        pipelineError: undefined,
      } as PropItem;
    });
    setPropsList(updated);
    void saveStudioProps(updated);
    setCurrentTab('dossier');
    if (live) {
      const id = activeProp.id;
      finalizeProp(id)
        .then(() => pollFinalUntilReady(id))
        .catch((e) => {
          console.error('finalize failed', e);
          // Surface an honest error and return to selection so the user can retry
          // (the most common cause is the selection not being confirmed yet).
          setPropsList((prev) => {
            const next = prev.map((p) =>
              p.id === id
                ? ({ ...p, status: 'awaiting_review' as PropItem['status'], pipelineError: 'Could not start final asset generation. Make sure your selection was recorded, then try again.' } as PropItem)
                : p
            );
            void saveStudioProps(next);
            return next;
          });
          setCurrentTab('selection');
        });
    }
  };

  const handleExportPackage = () => {
    if (!activeProp) return;
    const live = isLiveProp(activeProp);
    const updated = propsList.map((p) => {
      if (p.id === activeProp.id) {
        return {
          ...p,
          status: 'exported' as const,
          finalAssets: p.finalAssets
            ? { ...p.finalAssets, exportStatus: 'Exported ✓' as const }
            : undefined
        };
      }
      return p;
    });
    setPropsList(updated);
    void saveStudioProps(updated);
    // Push to the asset library / DAM via the agent for live props.
    if (live) {
      void exportProp(activeProp.id).catch((e) => console.error('export failed', e));
    }
  };

  // Delete a prop from the production slate (works from the catalogue and while
  // actively working on it). Removes it from the persisted slate; if the active
  // prop is deleted, fall back to the catalogue. (There is no server-side delete
  // endpoint — the slate the studio sees is the source of truth here.)
  const handleDeleteProp = (id: string) => {
    const prop = propsList.find((p) => p.id === id);
    const label = prop ? `${prop.name} (${prop.id})` : id;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete "${label}"?\n\nThis removes it from your production slate and can't be undone.`)
    ) {
      return;
    }
    const remaining = propsList.filter((p) => p.id !== id);
    setPropsList(remaining);
    void saveStudioProps(remaining);
    // Live props also live in the backend mirror (which the catalogue loads from),
    // so delete them there too or they'd reappear on the next reload.
    if (prop && isLiveProp(prop)) {
      void deleteLiveProp(id).catch((e) => console.error('delete on backend failed', e));
    }
    if (activePropId === id) {
      const next = remaining[0];
      setActivePropId(next ? next.id : '');
      setCurrentTab('catalogue');
    }
  };

  // Render empty prop notice if navigating to prop-specific views with 0 props
  const renderEmptyPropNotice = () => (
    <div className="max-w-2xl mx-auto my-16 p-8 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] text-center shadow-xs">
      <div className="w-12 h-12 mx-auto mb-4 bg-[#12A79D]/10 dark:bg-[#12A79D]/20 border border-[#12A79D]/30 flex items-center justify-center text-[#12A79D]">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="font-fraunces text-xl font-bold text-[#12201F] dark:text-[#EDF5F3] mb-2">
        No Hero Prop Selected
      </h3>
      <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mb-6 leading-relaxed">
        Your current production slate has no hero props yet. Draft your first brief or load the studio demo archive.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentTab('brief')}
          className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-5 py-2 text-xs font-mono-tag font-bold tracking-wider uppercase transition-colors cursor-pointer"
        >
          Draft Hero Prop Brief
        </button>
        <button
          type="button"
          onClick={handleResetToDemo}
          className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] text-[#12201F] dark:text-[#EDF5F3] px-4 py-2 text-xs font-mono-tag tracking-wider uppercase hover:border-[#12A79D] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-[#48605E] dark:text-[#8BA4A1]" />
          <span>Load Demo Archive</span>
        </button>
      </div>
    </div>
  );

  // Gate the entire studio behind login.
  if (!authed) {
    return <LoginScreen onAuthed={() => setAuthed(true)} />;
  }

  return (
    <div className={`min-h-screen bg-[#F7F4EC] dark:bg-[#0D1514] flex flex-col font-sans text-[#12201F] dark:text-[#EDF5F3] transition-colors ${theme}`}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono-tag text-xs tracking-wider uppercase text-[#48605E] dark:text-[#8BA4A1]">
            Loading studio…
          </div>
        </div>
      ) : (
      <>
      {/* Top Header with Navigation and 5-Layout Switcher */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        onNewProp={handleNewProp}
        activeProp={activeProp}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        productionProfile={productionProfile}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onDeleteActiveProp={activeProp ? () => handleDeleteProp(activeProp.id) : undefined}
      />

      {/* Main Content View Container */}
      <main className="flex-1 pb-16">
        <PipelineProgress prop={activeProp} />
        {currentTab === 'catalogue' && (
          <CataloguePage
            propsList={propsList}
            onSelectProp={handleSelectProp}
            onNewProp={handleNewProp}
            productionProfile={productionProfile}
            onResetDemo={handleResetToDemo}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onDeleteProp={handleDeleteProp}
          />
        )}

        {currentTab === 'brief' && (
          <BriefPage
            onCancel={() => setCurrentTab('catalogue')}
            onSubmitBrief={handleSubmitBrief}
          />
        )}

        {currentTab === 'options' && (
          activeProp ? (
            <ProofSheetPage
              prop={activeProp}
              onSelectOption={handleSelectOptionInProofSheet}
              onRequestMoreOptions={() => {
                alert('Requested 2 additional concept directions from generation engine.');
              }}
              onRefineBrief={() => setCurrentTab('brief')}
              onSkip={() => setCurrentTab('catalogue')}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          ) : (
            renderEmptyPropNotice()
          )
        )}

        {currentTab === 'selection' && (
          activeProp ? (
            <SelectionPage
              prop={activeProp}
              onBuildFinalAssets={handleBuildFinalAssets}
              onBackToOptions={() => setCurrentTab('options')}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          ) : (
            renderEmptyPropNotice()
          )
        )}

        {currentTab === 'dossier' && (
          activeProp ? (
            <DossierPage
              prop={activeProp}
              onExport={handleExportPackage}
              onBackToSelection={() => setCurrentTab('selection')}
              onUpdateProp={handleUpdateProp}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          ) : (
            renderEmptyPropNotice()
          )
        )}

        {currentTab === 'registry' && (
          <RegistryPage
            propsList={propsList}
            onSelectProp={handleSelectProp}
          />
        )}
      </main>

      {/* Studio Onboarding Flow Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleCompleteOnboarding}
        initialProfile={productionProfile}
      />
      </>
      )}
    </div>
  );
}

