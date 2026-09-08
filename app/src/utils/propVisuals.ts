// Visual generators for Museum Vitrine plates matching the Artifact Atelier theme
// Produces crisp, standalone SVG data URIs with brass, leather, iron, glass, parchment aesthetics

export function getPropArtwork(propKey: string, variant: string = 'main'): string {
  // SVG representations with authentic materials, hairlines, and museum plate lighting
  switch (propKey) {
    case 'astral_compass_opt_a':
    case 'astral_compass':
      return createAstralCompassSvg('front-open');
    case 'astral_compass_opt_b':
      return createAstralCompassSvg('side-gimbal');
    case 'astral_compass_opt_c':
      return createAstralCompassSvg('closed-compact');
    case 'astral_compass_opt_d':
      return createAstralCompassSvg('ornate-stand');
    
    // Turnarounds
    case 'astral_compass_front':
      return createAstralCompassSvg('front-open');
    case 'astral_compass_side':
      return createAstralCompassSvg('side-profile');
    case 'astral_compass_back':
      return createAstralCompassSvg('rear-plate');
    case 'astral_compass_three_quarter':
      return createAstralCompassSvg('perspective-iso');

    // Detail callouts
    case 'callout_dial':
      return createDetailSvg('dial');
    case 'callout_inner_ring':
      return createDetailSvg('ring');
    case 'callout_indicator':
      return createDetailSvg('indicator');
    case 'callout_hinge':
      return createDetailSvg('hinge');
    case 'callout_base':
      return createDetailSvg('base');
    case 'callout_compact':
      return createDetailSvg('compact');

    // Other props in catalogue
    case 'chronicle_ledger':
      return createBookSvg();
    case 'beacon_lantern':
      return createLanternSvg();
    case 'sigil_ring':
      return createRingSvg();
    case 'navigators_spyglass':
      return createSpyglassSvg();
    case 'dune_hourglass':
      return createHourglassSvg();
    case 'vault_key':
      return createKeySvg();
    case 'sunward_pendant':
      return createPendantSvg();
    case 'memory_vial':
      return createVialSvg();
    case 'sealed_directive':
      return createScrollSvg();
    case 'field_compass':
      return createPocketCompassSvg();
    case 'warden_gauntlet':
      return createGauntletSvg();

    default:
      return createAstralCompassSvg('front-open');
  }
}

// 1. Astral Compass SVG Generator (Armillary Astrolabe)
function createAstralCompassSvg(mode: string): string {
  let innerElements = '';

  if (mode === 'front-open' || mode === 'perspective-iso') {
    innerElements = `
      <!-- Vitrine Stage Shadow -->
      <ellipse cx="200" cy="275" rx="110" ry="18" fill="#12201F" opacity="0.08" />
      <ellipse cx="200" cy="274" rx="70" ry="10" fill="#12201F" opacity="0.14" />
      
      <!-- Base Pedestal -->
      <path d="M160 270 C160 262 175 258 200 258 C225 258 240 262 240 270 Z" fill="#997A3D" stroke="#523F1C" stroke-width="2" />
      <path d="M175 258 L185 220 L215 220 L225 258 Z" fill="#B89749" stroke="#523F1C" stroke-width="1.5" />
      <circle cx="200" cy="220" r="10" fill="#755B25" stroke="#3A2C10" stroke-width="1.5" />
      
      <!-- Outer Meridian Ring (Gilded Brass) -->
      <circle cx="200" cy="140" r="95" fill="none" stroke="#7A5E25" stroke-width="9" />
      <circle cx="200" cy="140" r="95" fill="none" stroke="#D4AF37" stroke-width="5" />
      <circle cx="200" cy="140" r="99" fill="none" stroke="#523F1C" stroke-width="1" stroke-dasharray="3,3" />

      <!-- Gimbal Ring 2 (Tilted 45deg) -->
      <ellipse cx="200" cy="140" rx="84" ry="40" fill="none" stroke="#B89749" stroke-width="5" transform="rotate(-30 200 140)" />
      <ellipse cx="200" cy="140" rx="84" ry="40" fill="none" stroke="#E6C86E" stroke-width="2" transform="rotate(-30 200 140)" />

      <!-- Gimbal Ring 3 (Equatorial Zodiac Band) -->
      <ellipse cx="200" cy="140" rx="80" ry="32" fill="none" stroke="#997A3D" stroke-width="6" transform="rotate(35 200 140)" />
      <ellipse cx="200" cy="140" rx="80" ry="32" fill="none" stroke="#12A79D" stroke-width="1.5" stroke-dasharray="4,2" transform="rotate(35 200 140)" />

      <!-- Center Astral Sphere with Constellations -->
      <circle cx="200" cy="140" r="38" fill="#12201F" stroke="#B89749" stroke-width="2.5" />
      <circle cx="200" cy="140" r="32" fill="#0B5F5A" opacity="0.4" />
      
      <!-- Celestial Constellation Runes -->
      <circle cx="188" cy="130" r="2.5" fill="#BFE3F2" />
      <circle cx="212" cy="132" r="2.5" fill="#BFE3F2" />
      <circle cx="200" cy="155" r="3" fill="#FFFFFF" />
      <circle cx="218" cy="150" r="2" fill="#BFE3F2" />
      <circle cx="182" cy="148" r="2" fill="#BFE3F2" />
      <line x1="188" y1="130" x2="200" y2="155" stroke="#BFE3F2" stroke-width="0.8" opacity="0.7" />
      <line x1="212" y1="132" x2="200" y2="155" stroke="#BFE3F2" stroke-width="0.8" opacity="0.7" />
      <line x1="212" y1="132" x2="218" y2="150" stroke="#BFE3F2" stroke-width="0.8" opacity="0.7" />
      <line x1="188" y1="130" x2="182" y2="148" stroke="#BFE3F2" stroke-width="0.8" opacity="0.7" />
      
      <!-- Central Needle / Alidade -->
      <polygon points="196,80 204,80 202,200 198,200" fill="#E6C86E" stroke="#523F1C" stroke-width="1" transform="rotate(25 200 140)" />
      <circle cx="200" cy="140" r="7" fill="#D4AF37" stroke="#3A2C10" stroke-width="1.5" />
      <circle cx="200" cy="140" r="2.5" fill="#12A79D" />

      <!-- Top Finial / Hanging Loop -->
      <path d="M192 45 C192 35 208 35 208 45 Z" fill="none" stroke="#D4AF37" stroke-width="3" />
      <circle cx="200" cy="45" r="4" fill="#755B25" />
    `;
  } else if (mode === 'side-gimbal' || mode === 'side-profile') {
    innerElements = `
      <!-- Shadow -->
      <ellipse cx="200" cy="275" rx="90" ry="16" fill="#12201F" opacity="0.1" />
      
      <!-- Base Profile -->
      <path d="M170 270 L185 220 L215 220 L230 270 Z" fill="#997A3D" stroke="#523F1C" stroke-width="2" />
      
      <!-- Slender Side View of Gimbal Rings -->
      <ellipse cx="200" cy="140" rx="30" ry="96" fill="none" stroke="#7A5E25" stroke-width="9" />
      <ellipse cx="200" cy="140" rx="26" ry="96" fill="none" stroke="#D4AF37" stroke-width="5" />
      
      <!-- Axis Pivot Rod -->
      <line x1="200" y1="40" x2="200" y2="240" stroke="#523F1C" stroke-width="5" />
      <line x1="200" y1="40" x2="200" y2="240" stroke="#E6C86E" stroke-width="2.5" />

      <!-- Center Astrolabe Core -->
      <circle cx="200" cy="140" r="32" fill="#12201F" stroke="#D4AF37" stroke-width="3" />
      <ellipse cx="200" cy="140" rx="15" ry="32" fill="none" stroke="#12A79D" stroke-width="2" />
      
      <!-- Outer Arc Bracket -->
      <path d="M160 140 C160 80 240 80 240 140" fill="none" stroke="#B89749" stroke-width="4" />
      <circle cx="200" cy="140" r="6" fill="#12A79D" />
    `;
  } else if (mode === 'closed-compact') {
    innerElements = `
      <!-- Shadow -->
      <ellipse cx="200" cy="265" rx="120" ry="24" fill="#12201F" opacity="0.14" />
      
      <!-- Brass Cylinder Casing -->
      <ellipse cx="200" cy="235" rx="100" ry="38" fill="#755B25" stroke="#3A2C10" stroke-width="2" />
      <path d="M100 175 L100 235 C100 270 300 270 300 235 L300 175 Z" fill="#997A3D" stroke="#3A2C10" stroke-width="2" />
      
      <!-- Stepped Cylindrical Lid -->
      <ellipse cx="200" cy="175" rx="100" ry="38" fill="#B89749" stroke="#523F1C" stroke-width="2.5" />
      <ellipse cx="200" cy="165" rx="82" ry="30" fill="#755B25" stroke="#3A2C10" stroke-width="2" />
      <ellipse cx="200" cy="155" rx="82" ry="30" fill="#D4AF37" stroke="#523F1C" stroke-width="2" />
      
      <!-- Top Engraved Rosette & Star Map -->
      <ellipse cx="200" cy="155" rx="60" ry="22" fill="#12201F" stroke="#E6C86E" stroke-width="1.5" />
      <ellipse cx="200" cy="155" rx="45" ry="16" fill="none" stroke="#12A79D" stroke-width="1" stroke-dasharray="3,2" />
      <circle cx="200" cy="155" r="5" fill="#E6C86E" />
      
      <!-- Latches & Screws -->
      <rect x="94" y="190" width="12" height="24" rx="3" fill="#D4AF37" stroke="#3A2C10" stroke-width="1" />
      <rect x="294" y="190" width="12" height="24" rx="3" fill="#D4AF37" stroke="#3A2C10" stroke-width="1" />
      <circle cx="200" cy="205" r="6" fill="#12A79D" stroke="#3A2C10" stroke-width="1" />
    `;
  } else if (mode === 'ornate-stand') {
    innerElements = `
      <!-- Shadow -->
      <ellipse cx="200" cy="275" rx="110" ry="18" fill="#12201F" opacity="0.12" />
      
      <!-- Heavy Quadripod Legs with Lion Paws -->
      <path d="M140 275 L170 230 L230 230 L260 275" fill="none" stroke="#523F1C" stroke-width="7" stroke-linecap="round" />
      <path d="M140 275 L170 230 L230 230 L260 275" fill="none" stroke="#B89749" stroke-width="4" stroke-linecap="round" />
      
      <!-- Vertical Gear Column -->
      <rect x="193" y="180" width="14" height="52" fill="#755B25" stroke="#3A2C10" stroke-width="1.5" />
      <circle cx="200" cy="195" r="9" fill="#D4AF37" />
      <circle cx="200" cy="215" r="7" fill="#B89749" />
      
      <!-- Armillary Sphere tilted dramatically -->
      <circle cx="200" cy="120" r="75" fill="none" stroke="#523F1C" stroke-width="7" />
      <circle cx="200" cy="120" r="75" fill="none" stroke="#D4AF37" stroke-width="4" />
      
      <ellipse cx="200" cy="120" rx="70" ry="25" fill="none" stroke="#B89749" stroke-width="3" transform="rotate(-40 200 120)" />
      <ellipse cx="200" cy="120" rx="70" ry="25" fill="none" stroke="#E6C86E" stroke-width="3" transform="rotate(40 200 120)" />
      
      <!-- Core with Turquoise Glow -->
      <circle cx="200" cy="120" r="28" fill="#12201F" stroke="#D4AF37" stroke-width="2" />
      <circle cx="200" cy="120" r="22" fill="#12A79D" opacity="0.35" />
      <circle cx="200" cy="120" r="8" fill="#E6C86E" stroke="#523F1C" stroke-width="1" />
    `;
  } else if (mode === 'rear-plate') {
    innerElements = `
      <!-- Shadow -->
      <ellipse cx="200" cy="275" rx="100" ry="16" fill="#12201F" opacity="0.1" />
      
      <!-- Base from Back -->
      <path d="M165 270 L185 220 L215 220 L235 270 Z" fill="#997A3D" stroke="#523F1C" stroke-width="2" />
      
      <!-- Solid Back Housing with Engraved Celestial Calendar -->
      <circle cx="200" cy="140" r="95" fill="#755B25" stroke="#3A2C10" stroke-width="4" />
      <circle cx="200" cy="140" r="88" fill="#997A3D" stroke="#523F1C" stroke-width="2" />
      <circle cx="200" cy="140" r="70" fill="#523F1C" stroke="#D4AF37" stroke-width="1" />
      
      <!-- Concentric Calendar Rims -->
      <circle cx="200" cy="140" r="60" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-dasharray="2,3" />
      <circle cx="200" cy="140" r="45" fill="none" stroke="#E6C86E" stroke-width="1" stroke-dasharray="6,3" />
      <circle cx="200" cy="140" r="30" fill="none" stroke="#12A79D" stroke-width="1.5" />
      
      <!-- Center Spindle Screw -->
      <polygon points="194,130 206,130 210,140 206,150 194,150 190,140" fill="#D4AF37" stroke="#3A2C10" stroke-width="1.5" />
      <circle cx="200" cy="140" r="4" fill="#3A2C10" />
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <!-- Vitrine Stage Floor Line -->
      <line x1="40" y1="275" x2="360" y2="275" stroke="#8BA4A1" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="2,2" />
      ${innerElements}
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

// 2. Detail Callout SVG Generator
function createDetailSvg(type: string): string {
  let content = '';
  switch (type) {
    case 'dial':
      content = `
        <circle cx="100" cy="100" r="78" fill="#12201F" stroke="#D4AF37" stroke-width="4" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#E6C86E" stroke-width="1" stroke-dasharray="2,3" />
        <circle cx="100" cy="100" r="50" fill="none" stroke="#12A79D" stroke-width="2" />
        <line x1="100" y1="35" x2="100" y2="165" stroke="#B89749" stroke-width="1.5" />
        <line x1="35" y1="100" x2="165" y2="100" stroke="#B89749" stroke-width="1.5" />
        <circle cx="100" cy="100" r="12" fill="#D4AF37" stroke="#3A2C10" stroke-width="1.5" />
        <circle cx="100" cy="100" r="5" fill="#12A79D" />
      `;
      break;
    case 'ring':
      content = `
        <ellipse cx="100" cy="100" rx="80" ry="35" fill="none" stroke="#755B25" stroke-width="14" />
        <ellipse cx="100" cy="100" rx="80" ry="35" fill="none" stroke="#E6C86E" stroke-width="8" />
        <ellipse cx="100" cy="100" rx="80" ry="35" fill="none" stroke="#12201F" stroke-width="1" stroke-dasharray="4,3" />
        <rect x="94" y="60" width="12" height="18" rx="2" fill="#12A79D" stroke="#3A2C10" stroke-width="1" />
      `;
      break;
    case 'indicator':
      content = `
        <circle cx="100" cy="100" r="60" fill="#12201F" stroke="#B89749" stroke-width="3" />
        <circle cx="100" cy="100" r="45" fill="#0B5F5A" opacity="0.6" />
        <circle cx="100" cy="100" r="18" fill="#12A79D" />
        <circle cx="100" cy="100" r="9" fill="#BFE3F2" />
        <polygon points="100,45 106,75 94,75" fill="#FFFFFF" />
      `;
      break;
    case 'hinge':
      content = `
        <rect x="60" y="45" width="80" height="110" rx="6" fill="#997A3D" stroke="#3A2C10" stroke-width="2.5" />
        <rect x="85" y="30" width="30" height="140" rx="8" fill="#D4AF37" stroke="#523F1C" stroke-width="2" />
        <circle cx="100" cy="55" r="5" fill="#3A2C10" />
        <circle cx="100" cy="100" r="5" fill="#3A2C10" />
        <circle cx="100" cy="145" r="5" fill="#3A2C10" />
      `;
      break;
    case 'base':
      content = `
        <ellipse cx="100" cy="110" rx="85" ry="35" fill="#755B25" stroke="#3A2C10" stroke-width="3" />
        <ellipse cx="100" cy="100" rx="85" ry="35" fill="#D4AF37" stroke="#523F1C" stroke-width="2" />
        <ellipse cx="100" cy="100" rx="60" ry="22" fill="#12201F" stroke="#E6C86E" stroke-width="1.5" />
        <path d="M85 95 L115 105 M85 105 L115 95" stroke="#12A79D" stroke-width="2" />
      `;
      break;
    case 'compact':
      content = `
        <ellipse cx="100" cy="120" rx="75" ry="25" fill="#12201F" opacity="0.1" />
        <rect x="45" y="70" width="110" height="50" rx="10" fill="#997A3D" stroke="#3A2C10" stroke-width="2" />
        <ellipse cx="100" cy="70" rx="55" ry="20" fill="#D4AF37" stroke="#523F1C" stroke-width="2" />
        <circle cx="100" cy="95" r="8" fill="#12A79D" stroke="#3A2C10" stroke-width="1.5" />
      `;
      break;
    default:
      content = `<circle cx="100" cy="100" r="50" fill="#D4AF37" />`;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" fill="none" />
      ${content}
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

// 3. Other Props in the 12 Catalogue items
function createBookSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="265" rx="90" ry="16" fill="#12201F" opacity="0.1" />
      <!-- Book Body -->
      <path d="M120 70 L260 50 L280 230 L140 250 Z" fill="#3D291D" stroke="#1E140C" stroke-width="2.5" />
      <!-- Gold Corner Brackets -->
      <polygon points="120,70 150,65 145,100" fill="#D4AF37" stroke="#1E140C" stroke-width="1" />
      <polygon points="260,50 230,55 235,80" fill="#D4AF37" stroke="#1E140C" stroke-width="1" />
      <polygon points="140,250 170,245 165,220" fill="#D4AF37" stroke="#1E140C" stroke-width="1" />
      <polygon points="280,230 250,235 255,205" fill="#D4AF37" stroke="#1E140C" stroke-width="1" />
      <!-- Embossed Seal -->
      <circle cx="200" cy="150" r="32" fill="#5E3F28" stroke="#D4AF37" stroke-width="2" />
      <circle cx="200" cy="150" r="22" fill="#12201F" />
      <path d="M190 140 L210 160 M210 140 L190 160" stroke="#12A79D" stroke-width="2.5" />
      <!-- Metal Clasp with Keyhole -->
      <rect x="255" y="135" width="28" height="28" rx="4" fill="#D4AF37" stroke="#1E140C" stroke-width="1.5" />
      <circle cx="269" cy="149" r="4" fill="#1E140C" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createLanternSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="270" rx="65" ry="14" fill="#12201F" opacity="0.12" />
      <!-- Iron Top Loop & Chimney -->
      <circle cx="200" cy="40" r="14" fill="none" stroke="#2B3234" stroke-width="4" />
      <path d="M175 60 L225 60 L215 85 L185 85 Z" fill="#2B3234" stroke="#12201F" stroke-width="2" />
      <path d="M165 85 L235 85 L220 115 L180 115 Z" fill="#48605E" stroke="#12201F" stroke-width="2" />
      <!-- Glass Cylinder -->
      <rect x="175" y="115" width="50" height="110" rx="6" fill="#F7F4EC" stroke="#2B3234" stroke-width="2" />
      <ellipse cx="200" cy="170" rx="20" ry="45" fill="#BFE3F2" opacity="0.4" />
      <!-- Internal Filament / Flame -->
      <circle cx="200" cy="165" r="12" fill="#E6C86E" />
      <circle cx="200" cy="165" r="6" fill="#FFFFFF" />
      <!-- Protective Cage Bars -->
      <line x1="180" y1="115" x2="180" y2="225" stroke="#2B3234" stroke-width="3" />
      <line x1="200" y1="115" x2="200" y2="225" stroke="#2B3234" stroke-width="2" />
      <line x1="220" y1="115" x2="220" y2="225" stroke="#2B3234" stroke-width="3" />
      <!-- Heavy Iron Base -->
      <path d="M160 225 L240 225 L245 260 L155 260 Z" fill="#2B3234" stroke="#12201F" stroke-width="2" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createRingSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="255" rx="70" ry="14" fill="#12201F" opacity="0.1" />
      <!-- Heavy Gold Band -->
      <ellipse cx="200" cy="175" rx="65" ry="60" fill="none" stroke="#7A5E25" stroke-width="24" />
      <ellipse cx="200" cy="175" rx="65" ry="60" fill="none" stroke="#D4AF37" stroke-width="16" />
      <ellipse cx="200" cy="175" rx="65" ry="60" fill="none" stroke="#F4D068" stroke-width="4" />
      <!-- Signet Bezel -->
      <polygon points="160,110 240,110 230,150 170,150" fill="#997A3D" stroke="#523F1C" stroke-width="2" />
      <ellipse cx="200" cy="110" rx="42" ry="24" fill="#B89749" stroke="#3A2C10" stroke-width="2" />
      <ellipse cx="200" cy="110" rx="34" ry="18" fill="#12201F" />
      <!-- Intaglio Crest -->
      <circle cx="200" cy="110" r="10" fill="none" stroke="#12A79D" stroke-width="1.5" />
      <path d="M195 106 L205 114 M205 106 L195 114" stroke="#D4AF37" stroke-width="1.5" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createSpyglassSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="255" rx="100" ry="14" fill="#12201F" opacity="0.1" />
      <!-- Telescope diagonal -->
      <g transform="rotate(-28 200 150)">
        <!-- Barrel 1 (Large, Leather Wrapped) -->
        <rect x="70" y="130" width="110" height="42" rx="4" fill="#52321C" stroke="#2E1B0E" stroke-width="2" />
        <line x1="100" y1="130" x2="100" y2="172" stroke="#D4AF37" stroke-width="3" />
        <line x1="150" y1="130" x2="150" y2="172" stroke="#D4AF37" stroke-width="3" />
        <!-- Objective Ring -->
        <rect x="60" y="127" width="12" height="48" rx="2" fill="#D4AF37" stroke="#3A2C10" stroke-width="1.5" />
        <!-- Glass Objective -->
        <line x1="60" y1="132" x2="60" y2="170" stroke="#BFE3F2" stroke-width="4" />
        <!-- Draw Tube 2 -->
        <rect x="180" y="134" width="70" height="34" fill="#B89749" stroke="#523F1C" stroke-width="1.5" />
        <!-- Draw Tube 3 -->
        <rect x="250" y="137" width="60" height="28" fill="#D4AF37" stroke="#523F1C" stroke-width="1.5" />
        <!-- Eyepiece -->
        <rect x="310" y="134" width="22" height="34" rx="3" fill="#755B25" stroke="#3A2C10" stroke-width="1.5" />
        <circle cx="332" cy="151" r="8" fill="#BFE3F2" stroke="#3A2C10" stroke-width="1" />
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createHourglassSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="270" rx="70" ry="14" fill="#12201F" opacity="0.1" />
      <!-- Top and Bottom Plates -->
      <rect x="145" y="45" width="110" height="14" rx="3" fill="#B89749" stroke="#3A2C10" stroke-width="2" />
      <rect x="145" y="245" width="110" height="14" rx="3" fill="#B89749" stroke="#3A2C10" stroke-width="2" />
      <!-- 3 Spindles -->
      <line x1="155" y1="59" x2="155" y2="245" stroke="#755B25" stroke-width="4" />
      <line x1="200" y1="59" x2="200" y2="245" stroke="#D4AF37" stroke-width="2" stroke-dasharray="10,6" />
      <line x1="245" y1="59" x2="245" y2="245" stroke="#755B25" stroke-width="4" />
      <!-- Glass Bulbs -->
      <path d="M165 60 C165 130 195 145 195 152 C195 159 165 174 165 244 L235 244 C235 174 205 159 205 152 C205 145 235 130 235 60 Z" fill="#F7F4EC" stroke="#48605E" stroke-width="1.5" />
      <!-- Dark Sand in lower bulb -->
      <path d="M175 244 C175 210 190 195 200 195 C210 195 225 210 225 244 Z" fill="#12201F" />
      <!-- Sand trickle -->
      <line x1="200" y1="140" x2="200" y2="195" stroke="#12201F" stroke-width="1.5" />
      <!-- Sand pile in upper bulb draining -->
      <path d="M175 75 C185 105 215 105 225 75 Z" fill="#48605E" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createKeySvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="255" rx="90" ry="14" fill="#12201F" opacity="0.1" />
      <g transform="rotate(-35 200 150)">
        <!-- Key Bow (Ornate Trefoil) -->
        <circle cx="120" cy="150" r="38" fill="none" stroke="#755B25" stroke-width="10" />
        <circle cx="120" cy="150" r="38" fill="none" stroke="#D4AF37" stroke-width="6" />
        <circle cx="120" cy="150" r="20" fill="none" stroke="#523F1C" stroke-width="3" />
        <circle cx="120" cy="130" r="8" fill="#12A79D" />
        <circle cx="105" cy="160" r="8" fill="#12A79D" />
        <circle cx="135" cy="160" r="8" fill="#12A79D" />
        <!-- Key Shank / Stem -->
        <rect x="158" y="145" width="130" height="10" rx="2" fill="#B89749" stroke="#523F1C" stroke-width="2" />
        <line x1="170" y1="143" x2="170" y2="157" stroke="#D4AF37" stroke-width="4" />
        <!-- Key Bit / Wards -->
        <path d="M265 155 L265 190 L285 190 L285 178 L275 178 L275 168 L285 168 L285 155 Z" fill="#997A3D" stroke="#3A2C10" stroke-width="2" />
        <circle cx="275" cy="184" r="2" fill="#12201F" />
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createPendantSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="265" rx="65" ry="14" fill="#12201F" opacity="0.1" />
      <!-- Chain Loop -->
      <path d="M160 30 Q200 130 200 140 Q200 130 240 30" fill="none" stroke="#755B25" stroke-width="3" stroke-dasharray="3,3" />
      <!-- Bail -->
      <rect x="194" y="130" width="12" height="18" rx="3" fill="#D4AF37" stroke="#523F1C" stroke-width="1.5" />
      <!-- Sunburst Radiating Rays -->
      <g transform="translate(200, 190)">
        ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => 
          `<polygon points="0,-65 4,-45 -4,-45" fill="#D4AF37" transform="rotate(${deg})" />`
        ).join('')}
        <circle cx="0" cy="0" r="45" fill="#B89749" stroke="#3A2C10" stroke-width="2" />
        <circle cx="0" cy="0" r="36" fill="#12201F" stroke="#D4AF37" stroke-width="2" />
        <circle cx="0" cy="0" r="24" fill="#0B5F5A" stroke="#BFE3F2" stroke-width="1.5" />
        <circle cx="0" cy="0" r="10" fill="#12A79D" />
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createVialSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="270" rx="45" ry="12" fill="#12201F" opacity="0.12" />
      <!-- Cork Stopper -->
      <polygon points="186,60 214,60 210,80 190,80" fill="#8C6239" stroke="#4D361F" stroke-width="1.5" />
      <rect x="180" y="80" width="40" height="12" rx="3" fill="#C4B79B" stroke="#48605E" stroke-width="1.5" />
      <!-- Glass Cylinder -->
      <path d="M182 92 L182 245 C182 260 218 260 218 245 L218 92 Z" fill="#F7F4EC" stroke="#48605E" stroke-width="2" />
      <!-- Golden Fluid -->
      <path d="M184 140 L184 243 C184 256 216 256 216 243 L216 140 Z" fill="#D4AF37" opacity="0.85" />
      <ellipse cx="200" cy="140" rx="16" ry="6" fill="#F4D068" />
      <!-- Luminescent Shimmer -->
      <circle cx="196" cy="180" r="3" fill="#FFFFFF" />
      <circle cx="206" cy="210" r="2.5" fill="#FFFFFF" />
      <!-- Glass reflection streak -->
      <path d="M188 105 L188 235" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createScrollSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="255" rx="85" ry="14" fill="#12201F" opacity="0.1" />
      <!-- Folded Parchment Envelope -->
      <rect x="125" y="90" width="150" height="120" rx="4" fill="#E8DEC8" stroke="#8C7A58" stroke-width="2" />
      <!-- Envelope Flaps -->
      <polygon points="125,90 275,90 200,165" fill="#DDD0B8" stroke="#8C7A58" stroke-width="1.5" />
      <polygon points="125,210 275,210 200,145" fill="#DDD0B8" stroke="#8C7A58" stroke-width="1.5" opacity="0.6" />
      <!-- Red Wax Seal -->
      <circle cx="200" cy="155" r="24" fill="#8B2635" stroke="#5A1520" stroke-width="2" />
      <circle cx="200" cy="155" r="18" fill="#A83244" />
      <path d="M192 150 L208 160 M208 150 L192 160" stroke="#5A1520" stroke-width="2" />
      <!-- Tied Twine / Cord -->
      <line x1="125" y1="155" x2="275" y2="155" stroke="#7A6843" stroke-width="2.5" stroke-dasharray="6,2" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createPocketCompassSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="265" rx="80" ry="16" fill="#12201F" opacity="0.1" />
      <!-- Top Crown / Ring -->
      <circle cx="200" cy="65" r="15" fill="none" stroke="#B89749" stroke-width="4" />
      <rect x="194" y="75" width="12" height="15" fill="#755B25" />
      <!-- Outer Brass Casing -->
      <circle cx="200" cy="165" r="80" fill="#755B25" stroke="#3A2C10" stroke-width="4" />
      <circle cx="200" cy="165" r="74" fill="#D4AF37" stroke="#523F1C" stroke-width="2" />
      <!-- Inner Dial -->
      <circle cx="200" cy="165" r="62" fill="#F7F4EC" stroke="#12201F" stroke-width="2" />
      <!-- Degree Ticks -->
      <circle cx="200" cy="165" r="56" fill="none" stroke="#48605E" stroke-width="1.5" stroke-dasharray="2,3" />
      <!-- Compass Rose -->
      <polygon points="200,115 206,165 194,165" fill="#B23A48" />
      <polygon points="200,215 206,165 194,165" fill="#12201F" />
      <polygon points="150,165 200,171 200,159" fill="#755B25" />
      <polygon points="250,165 200,171 200,159" fill="#755B25" />
      <!-- Center Pivot Jewel -->
      <circle cx="200" cy="165" r="7" fill="#D4AF37" stroke="#3A2C10" stroke-width="1.5" />
      <circle cx="200" cy="165" r="3" fill="#12A79D" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function createGauntletSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" fill="none" />
      <ellipse cx="200" cy="270" rx="75" ry="14" fill="#12201F" opacity="0.1" />
      <!-- Segmented Armored Gauntlet (Upright Hand) -->
      <!-- Forearm Vambrace -->
      <path d="M165 190 L235 190 L225 260 L175 260 Z" fill="#4B5658" stroke="#1E2324" stroke-width="2" />
      <rect x="170" y="210" width="60" height="6" fill="#D4AF37" />
      <!-- Articulated Wrist Plates -->
      <ellipse cx="200" cy="180" rx="34" ry="12" fill="#6A7A7C" stroke="#1E2324" stroke-width="2" />
      <ellipse cx="200" cy="168" rx="34" ry="12" fill="#7D9093" stroke="#1E2324" stroke-width="2" />
      <!-- Metacarpal Guard with Brass Sigil -->
      <path d="M170 160 L230 160 L225 110 L175 110 Z" fill="#4B5658" stroke="#1E2324" stroke-width="2" />
      <circle cx="200" cy="135" r="14" fill="#D4AF37" stroke="#1E2324" stroke-width="1.5" />
      <path d="M195 130 L205 140 M205 130 L195 140" stroke="#12201F" stroke-width="2" />
      <!-- Articulated Fingers (Thumb + 4 fingers) -->
      <rect x="172" y="70" width="10" height="40" rx="4" fill="#7D9093" stroke="#1E2324" stroke-width="1.5" />
      <rect x="186" y="60" width="11" height="50" rx="4" fill="#7D9093" stroke="#1E2324" stroke-width="1.5" />
      <rect x="201" y="55" width="11" height="55" rx="4" fill="#7D9093" stroke="#1E2324" stroke-width="1.5" />
      <rect x="216" y="65" width="10" height="45" rx="4" fill="#7D9093" stroke="#1E2324" stroke-width="1.5" />
      <rect x="156" y="110" width="12" height="30" rx="4" fill="#7D9093" stroke="#1E2324" stroke-width="1.5" transform="rotate(-25 160 120)" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}
