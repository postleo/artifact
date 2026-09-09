import React, { useState, useEffect } from 'react';
import { ActiveTab, PropItem, ProductionProfile, PropViewMode } from './types';
import { INITIAL_PROPS } from './data/propsData';
import { Header } from './components/Header';
import { CataloguePage } from './components/pages/CataloguePage';
import { BriefPage } from './components/pages/BriefPage';
import { ProofSheetPage } from './components/pages/ProofSheetPage';
import { SelectionPage } from './components/pages/SelectionPage';
import { DossierPage } from './components/pages/DossierPage';
import { RegistryPage } from './components/pages/RegistryPage';
import { OnboardingModal } from './components/OnboardingModal';
import { getPropArtwork } from './utils/propVisuals';
import { getStudioProfile, saveStudioProfile, getStudioProps, saveStudioProps, createProp, getProp } from './services/studioApi';
import { isAuthenticated } from './services/auth';
import { LoginScreen } from './components/LoginScreen';
import { Sparkles, Layers } from 'lucide-react';

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

  // Load persisted studio state (profile + props) from the backend DB on mount
  // (only once authenticated).
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const [profile, props] = await Promise.all([getStudioProfile(), getStudioProps()]);
        if (cancelled) return;
        if (profile) {
          setProductionProfile(profile);
        } else {
          // First run — no profile persisted yet: prompt onboarding.
          setIsOnboardingOpen(true);
        }
        if (props && props.length > 0) {
          setPropsList(props);
          setActivePropId(props[0].id);
        }
      } catch (e) {
        console.error('Failed to load studio state from backend:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

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
      setPropsList(INITIAL_PROPS);
      void saveStudioProps(INITIAL_PROPS);
      setActivePropId('ARF-00123');
      setCurrentTab('catalogue');
    }
  };

  const handleResetToDemo = () => {
    setPropsList(INITIAL_PROPS);
    void saveStudioProps(INITIAL_PROPS);
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
      setPropsList((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: status || p.status,
            options: hasOptions ? live.options : p.options,
            thumbnailUrl: hasRealImg ? live.options[0].imageUrl : p.thumbnailUrl,
            finalAssets:
              live.final_assets && live.final_assets.turnarounds?.length
                ? live.final_assets
                : p.finalAssets,
            costEstUsd: live.cost?.est_usd ? Math.round(live.cost.est_usd) : p.costEstUsd,
          } as PropItem;
        });
        void saveStudioProps(next);
        return next;
      });
      if (hasRealImg || (status && terminal.includes(status))) break;
    }
  };

  const handleSubmitBrief = async (newBriefData: Partial<PropItem>) => {
    // Kick off the REAL agent pipeline (backend -> agent -> Agent Engine -> Nano Banana).
    // Falls back to a local-only placeholder id if the backend is unreachable.
    let newId = `ARF-00${propsList.length + 124}`;
    let liveCreated = false;
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
      }
    } catch (e) {
      console.error('Live prop creation failed; showing local placeholder only:', e);
    }
    const newProp: PropItem = {
      id: newId,
      name: newBriefData.name || 'Untitled Hero Prop',
      status: liveCreated ? 'generating' : 'awaiting_review',
      shortDescription: newBriefData.shortDescription || '',
      world: newBriefData.world || productionProfile.projectName || 'Aetheria',
      era: newBriefData.era || productionProfile.worldLore || 'The Gilded Age of Drift',
      functionOnScreen: newBriefData.functionOnScreen || '',
      constraints: newBriefData.constraints || '',
      optionsCount: newBriefData.optionsCount || 4,
      thumbnailUrl: getPropArtwork('astral_compass_opt_a'),
      costEstUsd: 1250,
      timeEstDays: 5,
      referenceImages: newBriefData.referenceImages || [],
      options: [
        {
          id: 'A',
          code: `${newId}-OPT-A`,
          title: 'Primary Gilded Archetype',
          rationale: `Optimal balance of silhouette and ergonomic handling for ${newBriefData.name || 'this prop'}.`,
          imageUrl: getPropArtwork('astral_compass_opt_a'),
          silhouette: 'Clean geometric lines with clear key lighting reflection.',
          highlights: ['Reinforced chassis', 'Screen-accurate scale', 'Balanced weight']
        },
        {
          id: 'B',
          code: `${newId}-OPT-B`,
          title: 'Streamlined Aerodynamic Profile',
          rationale: 'Reduced ornamentation emphasizing practical field reliability and rapid on-camera access.',
          imageUrl: getPropArtwork('astral_compass_opt_b'),
          silhouette: 'Slender profile with minimal external snag hazards.',
          highlights: ['Sleek profile', 'High-contrast accents', 'Quick deploy']
        },
        {
          id: 'C',
          code: `${newId}-OPT-C`,
          title: 'Encased Heavy Duty Chassis',
          rationale: 'Reinforced industrial variant with sealed mechanisms and ruggedized hinges.',
          imageUrl: getPropArtwork('astral_compass_opt_c'),
          silhouette: 'Substantial cylindrical volume.',
          highlights: ['Knurled grips', 'Sealed seams', 'Shock-resistant housing']
        },
        {
          id: 'D',
          code: `${newId}-OPT-D`,
          title: 'Architectural Display Standard',
          rationale: 'Stationary hero configuration featuring decorative pedestal and intricate gearwork.',
          imageUrl: getPropArtwork('astral_compass_opt_d'),
          silhouette: 'Prominent tabletop silhouette.',
          highlights: ['Exposed brass gearing', 'Ornate base', 'High-relief crest']
        }
      ],
      selectedOptionId: 'A',
      decision: {
        optionId: 'A',
        whyWeChoseThis: `Option A for ${newBriefData.name} fulfills all practical on-set needs while staying faithful to the ${newBriefData.world || productionProfile.projectName} world-building.`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        approvers: [
          {
            name: productionProfile.leadName || 'Isla Venn',
            role: productionProfile.departmentRole || 'Art Director',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
          },
          {
            name: 'Rohan Patel',
            role: 'Creative Director',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
          },
          {
            name: 'Mira Solis',
            role: 'Production Designer',
            avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'
          }
        ],
        notes: [
          `Approved by lead art department team for ${newBriefData.world || productionProfile.projectName}.`,
          'Meets dimensional constraints (<20cm closed).',
          'Stunt-safe version to be cast in flexible urethane with safety-blunted edges.'
        ]
      },
      finalAssets: {
        createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        author: productionProfile.leadName || 'Isla Venn',
        turnarounds: [
          { angle: 'FRONT', imageUrl: getPropArtwork('astral_compass_front'), dimensionsNote: 'Front Elevation' },
          { angle: 'SIDE', imageUrl: getPropArtwork('astral_compass_side'), dimensionsNote: 'Profile' },
          { angle: 'BACK', imageUrl: getPropArtwork('astral_compass_back'), dimensionsNote: 'Rear Aspect' },
          { angle: 'THREE-QUARTER', imageUrl: getPropArtwork('astral_compass_three_quarter'), dimensionsNote: 'Perspective 3/4' }
        ],
        callouts: [
          { id: 'c1', title: 'Main Dial', subtitle: 'Engraved markers', imageUrl: getPropArtwork('callout_dial') },
          { id: 'c2', title: 'Rotational Pivot', subtitle: 'Ball bearing detent', imageUrl: getPropArtwork('callout_ring') },
          { id: 'c3', title: 'Alignment Latch', subtitle: 'Magnetic catch', imageUrl: getPropArtwork('callout_indicator') },
          { id: 'c4', title: 'Hinge Hardware', subtitle: 'Cold-forged brass', imageUrl: getPropArtwork('callout_hinge') },
          { id: 'c5', title: 'Maker Inscription', subtitle: 'Owner sigil', imageUrl: getPropArtwork('callout_base') },
          { id: 'c6', title: 'Stowage Profile', subtitle: 'Compacted form', imageUrl: getPropArtwork('callout_compact') }
        ],
        specTable: {
          dimensionsClosed: 'Ø 15.0 cm × H 6.0 cm',
          dimensionsOpen: 'Ø 20.0 cm × H 18.0 cm',
          weight: '1.20 kg',
          materials: 'Brass, Sapphire Glass, Leather',
          finishes: 'Antiqued Satin, Hand-buffed',
          stuntVariant: `${newId}-SV (Urethane safety duplicate)`,
          scriptedStates: 'Closed, Deployed, Active',
          mechanism: 'Dual-axis gimbal, magnetic detent',
          caregivingNotes: 'Store in dry velvet-lined case. Polish with microfiber.'
        },
        exportStatus: 'Ready to export',
        libraryDestination: `/Library/Props/${newId}_${newBriefData.name?.replace(/\s+/g, '_')}`,
        budgetCode: 'PRP-WEBG-002',
        budgetStatus: 'ON BUDGET'
      },
      sceneNumber: newBriefData.sceneNumber || 'SCENE 14',
      scriptExcerpt: newBriefData.scriptExcerpt,
      history: [
        {
          id: `hist-${Date.now()}-1`,
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: newBriefData.scriptExcerpt ? 'Hero Prop Brief Extracted from Production Script' : 'Hero Prop Brief Initialized',
          user: productionProfile.leadName || 'Isla Venn',
          role: productionProfile.departmentRole || 'Lead Prop Master',
          notes: `Parameters established for ${newBriefData.name}. Dimensional constraints & stunt requirements parsed.`,
          type: 'creation'
        },
        {
          id: `hist-${Date.now()}-2`,
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Concept Options Synthesized (4 Candidates)',
          user: 'Artifact Studio Engine',
          role: 'System Agent',
          notes: 'Divergent silhouettes generated with color-calibrated vitrine plates.',
          type: 'generation'
        }
      ],
      exportMetadata: {
        slateCode: `PRP-${newId.replace('ARF-', '')}-HRO-${newBriefData.sceneNumber?.replace(/\s+/g, '') || 'SC14'}-V1`,
        sceneCues: `${newBriefData.sceneNumber || 'SCENE 14'} · SLATE 01 · ROLL A`,
        rollTake: 'ROLL 01 / TAKE 01',
        cameraLens: 'Cooke Anamorphic /i 50mm T2.3',
        colorSpace: 'ACEScg (Linear AP1)',
        aspectRatio: '2.39:1 Anamorphic Scope',
        lutTarget: 'KODAK_5219_PRINT_FILM_D55',
        checksum: `sha256:${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`,
        version: 'v1.0-DRAFT',
        stuntDurometer: 'Shore 45A Soft Urethane Duplicate',
        damDestination: `/Library/Props/${newId}_${newBriefData.name?.replace(/\s+/g, '_')}`
      }
    };

    const updated = [newProp, ...propsList];
    setPropsList(updated);
    void saveStudioProps(updated);
    setActivePropId(newId);
    setCurrentTab('options');

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
    const updated = propsList.map((p) => {
      if (p.id === activeProp.id) {
        return {
          ...p,
          selectedOptionId: optionId,
          status: 'awaiting_review' as const,
          decision: {
            ...(p.decision || {
              optionId,
              whyWeChoseThis: '',
              date: 'May 14, 2024',
              approvers: [],
              notes: []
            }),
            optionId,
            whyWeChoseThis:
              notes ||
              p.options.find((o) => o.id === optionId)?.rationale ||
              'Option best balances readability and visual sophistication.'
          }
        };
      }
      return p;
    });
    setPropsList(updated);
    void saveStudioProps(updated);
    setCurrentTab('selection');
  };

  const handleBuildFinalAssets = () => {
    if (!activeProp) return;
    const updated = propsList.map((p) => {
      if (p.id === activeProp.id) {
        return {
          ...p,
          status: 'assets_ready' as const
        };
      }
      return p;
    });
    setPropsList(updated);
    void saveStudioProps(updated);
    setCurrentTab('dossier');
  };

  const handleExportPackage = () => {
    if (!activeProp) return;
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
      />

      {/* Main Content View Container */}
      <main className="flex-1 pb-16">
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

