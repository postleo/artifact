import { PropItem } from '../types';
import { getPropArtwork } from '../utils/propVisuals';

export const INITIAL_PROPS: PropItem[] = [
  {
    id: 'ARF-00123',
    name: 'Astral Compass',
    status: 'assets_ready',
    shortDescription: 'Arcane navigation device used by skyfarers to plot routes between floating isles. Brass construction with celestial engravings.',
    world: 'Aetheria',
    era: 'The Gilded Age of Drift',
    functionOnScreen: 'Opened to reveal rotating rings. Glows to align with constellations. Used in planning montages and travel transitions.',
    constraints: 'Must fit in hand. No more than 20cm diameter when closed. Needs stunt-safe variant without sharp points.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('astral_compass_opt_a'),
    costEstUsd: 1420,
    timeEstDays: 6,
    sceneNumber: 'SCENE 14',
    scriptExcerpt: 'REYES pulls a heavy, oil-tanned leather pouch from his sea-coat... He draws out the ASTRAL NAVIGATIONAL ASTROLABE. Gilded brass catches the flickering lantern flare.',
    history: [
      {
        id: 'hist-1',
        timestamp: 'May 12, 2024 · 09:15 AM',
        action: 'Brief Drafted & Script Scene 14 Parsed',
        user: 'Isla Venn',
        role: 'Lead Prop Master',
        notes: 'Extracted dimensional limits (<20cm) and water-plunge stunt requirements from script.',
        type: 'creation'
      },
      {
        id: 'hist-2',
        timestamp: 'May 12, 2024 · 09:18 AM',
        action: 'Concept Options Generated (4 Candidates)',
        user: 'Artifact Studio Engine',
        role: 'System Agent',
        notes: 'Generated divergent silhouettes: Tri-gimbal, Equinoctial, Cylindrical, Architectural.',
        type: 'generation'
      },
      {
        id: 'hist-3',
        timestamp: 'May 13, 2024 · 02:40 PM',
        action: 'Gate 1 Concept Proof Sheet Review',
        user: 'Mira Solis',
        role: 'Production Designer',
        notes: 'Option A and Option C selected for shortlist review with Director.',
        type: 'review'
      },
      {
        id: 'hist-4',
        timestamp: 'May 14, 2024 · 11:30 AM',
        action: 'Gate 2 Hero Selection Locked (Option A)',
        user: 'Rohan Patel & Isla Venn',
        role: 'Creative Director & Art Director',
        notes: 'Rationale locked: Open ring structure communicates celestial alignment best on 50mm lens.',
        type: 'selection'
      },
      {
        id: 'hist-5',
        timestamp: 'May 20, 2024 · 04:15 PM',
        action: 'Gate 3 Final Asset Package & Turnaround Generated',
        user: 'Artifact Studio Engine',
        role: 'System Agent',
        notes: 'Orthographic 4-view turnaround, 6 detail callouts, and CMF specs compiled.',
        type: 'dossier'
      }
    ],
    exportMetadata: {
      slateCode: 'PRP-042-HRO-SC14_TK02-V1',
      sceneCues: 'SCENE 14 · SLATE 04 · ROLL B',
      rollTake: 'ROLL 04 / TAKE 02',
      cameraLens: 'Cooke Anamorphic /i 50mm T2.3',
      colorSpace: 'ACEScg (Linear AP1)',
      aspectRatio: '2.39:1 Anamorphic Scope',
      lutTarget: 'KODAK_5219_PRINT_FILM_D55',
      checksum: 'sha256:7c9e102f...e481',
      version: 'v1.4-LOCKED',
      stuntDurometer: 'Shore 45A Soft Urethane Duplicate',
      damDestination: '/Library/Props/ARF-00123_Astral_Compass'
    },
    currentVersionId: 'v1.0-HERO',
    versions: [
      {
        versionId: 'v1.0-HERO',
        label: 'Film 1 Hero Master (Antiqued Brass)',
        filmTitle: 'The Drift: Part I (Original Film)',
        author: 'Isla Venn (Lead Prop Master)',
        date: 'May 14, 2024',
        status: 'ACTIVE_HERO',
        changelog: 'Original hero master hand-turned in brass with optical sapphire lens and magnetic detent.',
        scenesUsed: ['Scene 14', 'Scene 18', 'Scene 54'],
        stuntDuplicateRating: 'Hero Close-Up Only (Do NOT plunge in water)',
        checksum: 'sha256:7c9e102f4a12e481',
        isCurrent: true
      },
      {
        versionId: 'v1.1-STUNT',
        label: 'Underwater Stunt Cast (Shore 45A Urethane)',
        filmTitle: 'The Drift: Part I (Original Film)',
        author: 'Kael Thorne (Stunt Fabrication Lead)',
        date: 'May 22, 2024',
        status: 'STUNT_ACTIVE',
        changelog: 'Flexible lightweight urethane casting painted with hydro-resistant leaf paint for water plunge sequence in Scene 22.',
        scenesUsed: ['Scene 22'],
        stuntDuplicateRating: 'Water Immersion / High-Impact Safe',
        checksum: 'sha256:4b8a9201df639c02',
        isCurrent: false
      },
      {
        versionId: 'v2.0-SEQUEL',
        label: 'Sequel Chrono Upgrade (3-Year Time-Jump)',
        filmTitle: 'The Drift: Part II - Leviathan (Sequel)',
        author: 'Isla Venn & Studio Continuity Dept',
        date: 'Pending Pre-Prod (2026)',
        status: 'SEQUEL_PLANNED',
        changelog: 'Maintains exact 7-star dial alignment from Film 1; introduces weather-hardened verdigris patina and reinforced copper latch rivets reflecting character journey.',
        scenesUsed: ['Sequel Scene 04', 'Sequel Scene 29'],
        stuntDuplicateRating: 'Dual Hero / Field Grade',
        checksum: 'sha256:e019fb44aa81023c',
        isCurrent: false
      }
    ],
    sceneUsageTimeline: [
      {
        sceneId: 'sc-14',
        sceneNumber: 'SCENE 14',
        sceneSlug: 'EXT. CYCLADES ARCHIPELAGO - DAWN',
        productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
        actionDescription: 'REYES pulls the Astrolabe from oilskin pouch. First hero reveal of celestial dial.',
        crewHandlingNotes: 'Use cotton gloves for setup. Wipe fingerprints with lens cloth immediately before rolling A-camera.',
        characterUsing: 'Captain Reyes (Hero)',
        lightingCameraNotes: '50mm Cooke Anamorphic T2.3. Key light hits the inner ring at 45° angle to catch brass bevel flare.',
        stuntVersionRequired: false
      },
      {
        sceneId: 'sc-22',
        sceneNumber: 'SCENE 22',
        sceneSlug: 'INT. CORAL SEA CAVE - NIGHT (STUNT DIVE)',
        productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
        actionDescription: 'Reyes falls from collapsing gangplank into sea cave. Prop is dropped into saltwater.',
        crewHandlingNotes: 'DO NOT USE v1.0 HERO! Switch to v1.1-STUNT Urethane Duplicate. Rinse in fresh water between takes.',
        characterUsing: 'Stunt Double / Reyes',
        lightingCameraNotes: 'High-speed 96fps Phantom camera. Water splash illumination from 1.2kW underwater HMI.',
        stuntVersionRequired: true
      },
      {
        sceneId: 'sc-54',
        sceneNumber: 'SCENE 54',
        sceneSlug: "INT. ASTRONOMER'S VAULT - CLIMAX",
        productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
        actionDescription: 'Reyes places Astrolabe into the planetary pedestal receptacle. Rings align and lock.',
        crewHandlingNotes: 'Inspect alignment detents before scene. Mechanical magnetic catch must engage smoothly on dialogue line.',
        characterUsing: 'Reyes & Mara',
        lightingCameraNotes: 'Macro probe lens. Interior dial illumination calibrated to 480nm cyan-teal.',
        stuntVersionRequired: false
      },
      {
        sceneId: 'sc-post',
        sceneNumber: 'POST-PROD',
        sceneSlug: 'ARCHIVAL ACCESSION & VAULT STOWAGE',
        productionPhase: 'POST_PRODUCTION_ARCHIVAL',
        actionDescription: 'Physical hero wrap after wrap party. Preserved for franchise continuity and museum display.',
        crewHandlingNotes: 'Stored in Pelican Storm Case #09 with desiccant packs. Relative humidity maintained at 45%.',
        characterUsing: 'Art Department Archival Caretaker',
        lightingCameraNotes: 'Archival 360 photogrammetry scans logged for VFX digital double asset.',
        stuntVersionRequired: false,
        archivalLocation: 'Pinewood Studio Archival Vault A · Rack 04 · Pelican Box #09'
      }
    ],
    franchiseContinuity: {
      filmCanonBaseline: 'Film 1 established the Astral Compass as an 8th-dynasty Aetherian artifact with a specific 7-star constellation engraving and 14.8cm closed diameter.',
      strictContinuityConstraints: [
        'CONSTELLATION PATTERN: The 7-star engraving on the primary dial is key story canon and MUST NOT be flipped, rotated, or redrawn in sequels.',
        'COLOR TEMP & EMISSION: When aligned, dial glows at exactly 480nm (Cyan-Teal #12A79D). VFX color pipeline relies on this LUT match.',
        'DIMENSIONAL ENVELOPE: Diameter must remain exactly 14.8cm closed to fit existing prop holsters and actor muscle memory.',
        'SCENE 22 BATTLE SCAR: The 1.2mm impact notch on the outer ring from the Scene 22 sea cave fall MUST be replicated on all sequel versions.'
      ],
      allowedSequelEvolutions: [
        'PATINA & AGE: Darkened verdigris patina and leather strap distress are permitted to indicate the 3-year canonical timeline jump.',
        'LATCH MECHANISM: Copper reinforcement rivets may be added as practical field repairs by the character.',
        'INTERNAL RESISTOR: Subtle internal gear clicking sound design can be updated without visual violation.'
      ],
      sequelWarningAlerts: [
        'CRITICAL: Do NOT substitute modern hex screws. Only slotted countersunk brass screws are canon compliant.',
        'CONTINUITY WARNING: Previous film VFX models (Asset: VFX_ASTRO_V1) align to the 3-ring gimbal; any gimbal ring count change will break digital double continuity.'
      ],
      previousFilmsReferences: [
        {
          filmTitle: 'The Drift: Part I',
          year: '2024',
          sceneOccurrences: 'Scenes 14, 18, 22, 54',
          keyMoments: 'First reveal on ship prow; underwater stunt dive in sea cave; vault alignment puzzle climax.'
        }
      ]
    },
    referenceImages: [
      { id: 'ref-1', name: 'Armillary Astrolabe 17th C', url: getPropArtwork('astral_compass_opt_a') },
      { id: 'ref-2', name: 'Gilded Pocket Compass', url: getPropArtwork('field_compass') },
      { id: 'ref-3', name: 'Celestial Chart Engraving', url: getPropArtwork('callout_dial') }
    ],
    options: [
      {
        id: 'A',
        code: 'ARF-00123-OPT-A',
        title: 'Tri-Gimbal Open Armillary',
        rationale: 'Option A best balances readability and visual sophistication. The open ring structure clearly communicates celestial alignment and allows room for hero engravings. It reflects the world\'s brasswork aesthetic and performs well in silhouette.',
        imageUrl: getPropArtwork('astral_compass_opt_a'),
        silhouette: 'High drama, distinct concentric circles against lighting.',
        highlights: ['Open gimbal cage', 'Central constellation core', 'Stepped pedestal base']
      },
      {
        id: 'B',
        code: 'ARF-00123-OPT-B',
        title: 'Single-Axis Equinoctial Dial',
        rationale: 'Minimalist vertical axis profile emphasizing clean aerodynamic lines, but reduced mechanical layering for close-up inspection.',
        imageUrl: getPropArtwork('astral_compass_opt_b'),
        silhouette: 'Slender vertical profile, excellent side-lighting bounce.',
        highlights: ['Tilted meridian needle', 'Streamlined mounting bracket', 'Quick-reading vernier scale']
      },
      {
        id: 'C',
        code: 'ARF-00123-OPT-C',
        title: 'Stepped Cylindrical Chronometer',
        rationale: 'Heavy-duty enclosed pocket design prioritizing practical stowage on airships, though less visibly dramatic on screen when closed.',
        imageUrl: getPropArtwork('astral_compass_opt_c'),
        silhouette: 'Stout cylindrical silhouette with knurled perimeter rings.',
        highlights: ['Protective brass casing', 'Engraved rosette lid', 'Magnetic release latch']
      },
      {
        id: 'D',
        code: 'ARF-00123-OPT-D',
        title: 'Quadripod Astrological Horizon',
        rationale: 'Architectural tabletop form with claw feet and counter-weighted rings. Strong presence for captain\'s quarters, less portable for actors.',
        imageUrl: getPropArtwork('astral_compass_opt_d'),
        silhouette: 'Wide stable base with tilted nested rings.',
        highlights: ['Clawed leg support', 'Exposed gear rack', 'Lumiradial focal sphere']
      }
    ],
    selectedOptionId: 'A',
    decision: {
      optionId: 'A',
      whyWeChoseThis: 'Option A best balances readability and visual sophistication. The open ring structure clearly communicates celestial alignment and allows room for hero engravings. It reflects the world\'s brasswork aesthetic and performs well in silhouette.',
      date: 'May 14, 2024',
      approvers: [
        {
          name: 'Isla Venn',
          role: 'Art Director',
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
        'Open structure supports key lighting moments on actors\' faces',
        'Outer ring can carry runes for storytelling and lore hints',
        'Stunt variant will replace sharp finials with rounded caps',
        'Mechanism to include subtle magnetic resistance for tactile feel'
      ]
    },
    finalAssets: {
      createdDate: 'May 14, 2024',
      updatedDate: 'May 20, 2024',
      author: 'Isla Venn',
      turnarounds: [
        { angle: 'FRONT', imageUrl: getPropArtwork('astral_compass_front'), dimensionsNote: '20.1cm dia' },
        { angle: 'SIDE', imageUrl: getPropArtwork('astral_compass_side'), dimensionsNote: '18.3cm height' },
        { angle: 'BACK', imageUrl: getPropArtwork('astral_compass_back'), dimensionsNote: 'Solid rear plate' },
        { angle: 'THREE-QUARTER', imageUrl: getPropArtwork('astral_compass_three_quarter'), dimensionsNote: '35° perspective' }
      ],
      callouts: [
        { id: 'c1', title: 'Dial engraving', subtitle: 'Celestial coordinates', imageUrl: getPropArtwork('callout_dial') },
        { id: 'c2', title: 'Inner ring mechanism', subtitle: 'Rotates & locks', imageUrl: getPropArtwork('callout_ring') },
        { id: 'c3', title: 'Alignment indicator', subtitle: 'Glows when aligned', imageUrl: getPropArtwork('callout_indicator') },
        { id: 'c4', title: 'Hinge & latch', subtitle: 'Precision brasswork', imageUrl: getPropArtwork('callout_hinge') },
        { id: 'c5', title: 'Base engraving', subtitle: 'Owner sigil', imageUrl: getPropArtwork('callout_base') },
        { id: 'c6', title: 'Compact closed form', subtitle: 'For stowage', imageUrl: getPropArtwork('callout_compact') }
      ],
      specTable: {
        dimensionsClosed: 'Ø 14.8 cm × H 6.2 cm',
        dimensionsOpen: 'Ø 20.1 cm × H 18.3 cm',
        weight: '1.28 kg',
        materials: 'Brass, Enamel, Sapphire Glass',
        finishes: 'Antiqued Brass, Hand-engraved',
        stuntVariant: 'ARF-00123-SV (Stunt-safe lightweight urethane)',
        scriptedStates: 'Closed, Opening, Locked, Aligning, Aligned (Glow)',
        mechanism: 'Manual, Magnetic Resistance',
        caregivingNotes: 'Wipe with soft cloth. Avoid moisture. Store in felt-lined velvet box.'
      },
      exportStatus: 'Ready to export',
      libraryDestination: '/Library/Props/ARF-00123_Astral_Compass',
      budgetCode: 'PRP-WEBG-001',
      budgetStatus: 'ON BUDGET'
    }
  },
  {
    id: 'ARF-00124',
    name: 'Chronicle Ledger',
    status: 'assets_ready',
    shortDescription: 'Ancient illuminated codex bound in weathered dark calfskin with bronze clasps and protective corner brackets.',
    world: 'Aetheria',
    era: 'The Gilded Age of Drift',
    functionOnScreen: 'Consulted in archive scenes, reveals encrypted lineage map.',
    constraints: 'Must have 40 readable parchment pages with faux calligraphy.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('chronicle_ledger'),
    costEstUsd: 1100,
    timeEstDays: 5,
    referenceImages: [
      { id: 'ref-cl-1', name: 'Medieval Chained Bible', url: getPropArtwork('chronicle_ledger') }
    ],
    options: [
      {
        id: 'A',
        code: 'ARF-00124-OPT-A',
        title: 'Embossed Leather with Twin Bronze Clasps',
        rationale: 'Provides tactile weight and dramatic audible snap when opened on microphone.',
        imageUrl: getPropArtwork('chronicle_ledger'),
        silhouette: 'Substantial rectangular volume with metallic accents.',
        highlights: ['Dark calfskin', 'Deep intaglio crest', 'Keyed bronze latch']
      }
    ]
  },
  {
    id: 'ARF-00125',
    name: 'Beacon Lantern',
    status: 'generating',
    shortDescription: 'High-output aetheric oil lantern carried on night scouting expeditions through cloud banks.',
    world: 'Aetheria',
    era: 'The Gilded Age of Drift',
    functionOnScreen: 'Actor holds to illuminate dark caverns, shutter adjusts beam aperture.',
    constraints: 'Must house 2800K LED warm light puck with remote dimmer trigger.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('beacon_lantern'),
    costEstUsd: 980,
    timeEstDays: 4,
    referenceImages: [],
    options: []
  },
  {
    id: 'ARF-00126',
    name: 'Sigil Ring',
    status: 'awaiting_review',
    shortDescription: 'Heavy crest signet ring forged from raw electrum, worn by the Guild High Inquisitor.',
    world: 'Aetheria',
    era: 'The Gilded Age of Drift',
    functionOnScreen: 'Used in macro insert shot pressing into molten sealing wax.',
    constraints: 'Mirror-reversed intaglio seal to produce sharp positive stamp.',
    optionsCount: 3,
    thumbnailUrl: getPropArtwork('sigil_ring'),
    costEstUsd: 650,
    timeEstDays: 3,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00126-OPT-A',
        title: 'Oval Bezel Deep Intaglio',
        rationale: 'Clean stamping release without wax adhesion.',
        imageUrl: getPropArtwork('sigil_ring'),
        silhouette: 'Bold signet head with faceted shank.',
        highlights: ['Faceted gold shoulder', 'Guild crest', 'Wax release polish']
      }
    ]
  },
  {
    id: 'ARF-00127',
    name: "Navigator's Spyglass",
    status: 'assets_ready',
    shortDescription: 'Three-draw brass refractor telescope wrapped in hand-stitched cordovan leather.',
    world: 'Solaria',
    era: 'Age of Discovery',
    functionOnScreen: 'Extended with single flick by First Officer on the prow.',
    constraints: 'Smooth internal friction collars with zero wobble when drawn.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('navigators_spyglass'),
    costEstUsd: 1350,
    timeEstDays: 6,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00127-OPT-A',
        title: 'Triple-Draw Fluted Grip',
        rationale: 'Balanced center of mass when extended, audible sliding air pressure.',
        imageUrl: getPropArtwork('navigators_spyglass'),
        silhouette: 'Tapered elongated form.',
        highlights: ['Cordovan leather wrap', 'Dual optical baffles', 'Sun shade hood']
      }
    ]
  },
  {
    id: 'ARF-00128',
    name: 'Dune Hourglass',
    status: 'generating',
    shortDescription: 'Twin-bulb chronometric vessel filled with pulverized obsidian sand that flows against gravity.',
    world: 'Verdant Reach',
    era: 'Solar Renaissance',
    functionOnScreen: 'Inverted to commence the trial countdown in the Grand Council.',
    constraints: 'Calibrated exactly to 3 minutes 30 seconds flow duration.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('dune_hourglass'),
    costEstUsd: 1200,
    timeEstDays: 5,
    referenceImages: [],
    options: []
  },
  {
    id: 'ARF-00129',
    name: 'Vault Key',
    status: 'awaiting_review',
    shortDescription: 'Intricate skeleton key featuring concentric revolving wards and a crowned trefoil bow.',
    world: 'Ironspire',
    era: 'Victorian Neo-Gothic',
    functionOnScreen: 'Inserted into treasury door, tumblers click into alignment.',
    constraints: 'Weight must feel authentically heavy (>250g brass).',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('vault_key'),
    costEstUsd: 520,
    timeEstDays: 3,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00129-OPT-A',
        title: 'Trefoil Bow with Revolving Tumbler Bit',
        rationale: 'The interlocking teeth allow realistic lock engagement in extreme close-up shots.',
        imageUrl: getPropArtwork('vault_key'),
        silhouette: 'Classic ornamental silhouette with geometric bit.',
        highlights: ['Trefoil ring', 'Fluted stem', 'Concentric wards']
      }
    ]
  },
  {
    id: 'ARF-00130',
    name: 'Sunward Pendant',
    status: 'assets_ready',
    shortDescription: 'Luminescent medallion bearing twelve radiant gold spokes centered with a cut sapphire lens.',
    world: 'Solaria',
    era: 'Solar Renaissance',
    functionOnScreen: 'Worn by the Princess, catches setting sunlight to project a map onto temple ruins.',
    constraints: 'Custom optical prism to focus sunlight into coherent geometric beacon.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('sunward_pendant'),
    costEstUsd: 1450,
    timeEstDays: 7,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00130-OPT-A',
        title: 'Twelve-Spoke Solar Corona',
        rationale: 'Maximum light transmission while resting flat against costume fabric.',
        imageUrl: getPropArtwork('sunward_pendant'),
        silhouette: 'Radiant circular starburst.',
        highlights: ['Faceted sapphire core', 'Gilded spokes', 'Hidden prism bevel']
      }
    ]
  },
  {
    id: 'ARF-00131',
    name: 'Memory Vial',
    status: 'generating',
    shortDescription: 'Hand-blown quartz phial containing bioluminescent suspension that swirls when heated by touch.',
    world: 'Verdant Reach',
    era: 'Age of Drift',
    functionOnScreen: 'Uncorked to release glowing tendrils of remembered voice.',
    constraints: 'Hermetically sealed stopper with inert fluid safe for actor handling.',
    optionsCount: 3,
    thumbnailUrl: getPropArtwork('memory_vial'),
    costEstUsd: 890,
    timeEstDays: 4,
    referenceImages: [],
    options: []
  },
  {
    id: 'ARF-00132',
    name: 'Sealed Directive',
    status: 'awaiting_review',
    shortDescription: 'Imperial parchment folded into a cryptographic diamond fold and bonded with cinnabar sealing wax.',
    world: 'Ironspire',
    era: 'Victorian Neo-Gothic',
    functionOnScreen: 'Sliced open with silver letter opener by Commander on battlefield.',
    constraints: 'Wax seal must cleanly crack along score line without messy crumbs.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('sealed_directive'),
    costEstUsd: 380,
    timeEstDays: 2,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00132-OPT-A',
        title: 'Diamond Fold with Stamped Ribbon',
        rationale: 'Historical origami fold allows dramatic single-motion reveal on camera.',
        imageUrl: getPropArtwork('sealed_directive'),
        silhouette: 'Precise geometric envelope with wax medallion.',
        highlights: ['Aged rag vellum', 'Silk cord tie', 'Cinnabar stamp']
      }
    ]
  },
  {
    id: 'ARF-00133',
    name: 'Field Compass',
    status: 'assets_ready',
    shortDescription: 'Hunter\'s pocket-watch style directional compass with hunter lid and luminescent radium dial markings.',
    world: 'Solaria',
    era: 'Age of Discovery',
    functionOnScreen: 'Flipped open with thumb, needle quivers and locks onto anomaly.',
    constraints: 'Spring-loaded lid latch with crisp mechanical release.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('field_compass'),
    costEstUsd: 940,
    timeEstDays: 4,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00133-OPT-A',
        title: 'Spring-Loaded Hunter Casing',
        rationale: 'Snap-open action provides strong non-verbal actor gesture.',
        imageUrl: getPropArtwork('field_compass'),
        silhouette: 'Circular pocket case with crown ring.',
        highlights: ['Jeweled pivot', 'Enamelled compass rose', 'Lid push-button']
      }
    ]
  },
  {
    id: 'ARF-00134',
    name: 'Warden Gauntlet',
    status: 'awaiting_review',
    shortDescription: 'Articulated hand defense forged from blackened spring steel with brass sigil knuckles and calfskin glove liner.',
    world: 'Ironspire',
    era: 'The Iron Age',
    functionOnScreen: 'Worn during sword duel, parries blade with clang and spark.',
    constraints: 'Full finger dexterity; actor must be able to hold rapier hilt securely.',
    optionsCount: 4,
    thumbnailUrl: getPropArtwork('warden_gauntlet'),
    costEstUsd: 1850,
    timeEstDays: 8,
    referenceImages: [],
    options: [
      {
        id: 'A',
        code: 'ARF-00134-OPT-A',
        title: 'Articulated Lames with Knuckle Guard',
        rationale: 'Permits 100% natural wrist flexion while protecting stunts.',
        imageUrl: getPropArtwork('warden_gauntlet'),
        silhouette: 'Segmented aggressive armor silhouette.',
        highlights: ['Spring steel lames', 'Leather glove integration', 'Brass knuckle runes']
      }
    ]
  }
];
