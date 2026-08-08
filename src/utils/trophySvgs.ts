// 3D Trophy SVGs - Realistic metallic effects with shadows and depth

export const TROPHY_SVGS: Record<string, string> = {
  manofmatch: `
    <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Metallic gold gradient -->
        <linearGradient id="motmGold" x1="30" y1="0" x2="90" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFF8DC"/>
          <stop offset="15%" stop-color="#FFD700"/>
          <stop offset="35%" stop-color="#FFC125"/>
          <stop offset="50%" stop-color="#FFD700"/>
          <stop offset="65%" stop-color="#DAA520"/>
          <stop offset="85%" stop-color="#B8860B"/>
          <stop offset="100%" stop-color="#8B6914"/>
        </linearGradient>
        <!-- Shine highlight -->
        <linearGradient id="motmShine" x1="40" y1="20" x2="60" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.7"/>
          <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
        </linearGradient>
        <!-- Ribbon gradient -->
        <linearGradient id="ribbonGrad" x1="40" y1="0" x2="60" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FF4444"/>
          <stop offset="50%" stop-color="#CC0000"/>
          <stop offset="100%" stop-color="#880000"/>
        </linearGradient>
        <!-- 3D shadow -->
        <filter id="motm3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
          <feOffset dx="3" dy="6" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.35" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Inner glow -->
        <filter id="motmGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="140" rx="35" ry="8" fill="#000" opacity="0.3"/>
      
      <!-- Ribbon behind medal -->
      <path d="M42 8 L52 35 L60 28 L68 35 L78 8 L72 8 L60 30 L48 8 Z" fill="url(#ribbonGrad)" stroke="#660000" stroke-width="0.5" filter="url(#motm3d)"/>
      
      <!-- Medal outer ring -->
      <circle cx="60" cy="70" r="42" fill="url(#motmGold)" stroke="#8B6914" stroke-width="2" filter="url(#motm3d)"/>
      
      <!-- Medal inner ring -->
      <circle cx="60" cy="70" r="36" fill="none" stroke="#FFF8DC" stroke-width="1.5" opacity="0.5"/>
      
      <!-- Medal face - darker center for depth -->
      <circle cx="60" cy="70" r="33" fill="#DAA520" stroke="#B8860B" stroke-width="1"/>
      
      <!-- Star - raised 3D effect -->
      <path d="M60 38 L65 55 L83 55 L69 65 L74 82 L60 72 L46 82 L51 65 L37 55 L55 55 Z" 
            fill="url(#motmGold)" stroke="#FFF8DC" stroke-width="1" filter="url(#motmGlow)"/>
      <path d="M60 42 L63 54 L78 54 L66 62 L70 76 L60 68 L50 76 L54 62 L42 54 L57 54 Z" 
            fill="#FFF8DC" opacity="0.3"/>
      
      <!-- Shine effect -->
      <ellipse cx="48" cy="55" rx="12" ry="8" fill="url(#motmShine)" transform="rotate(-20 48 55)"/>
      
      <!-- Medal edge highlight -->
      <path d="M25 50 Q22 70 25 90" stroke="#FFF8DC" stroke-width="1.5" fill="none" opacity="0.4"/>
      
      <!-- Base/stand -->
      <rect x="50" y="112" width="20" height="18" rx="2" fill="#B8860B" stroke="#8B6914" stroke-width="1.5"/>
      <rect x="52" y="112" width="16" height="18" rx="1" fill="url(#motmGold)"/>
      <rect x="45" y="128" width="30" height="8" rx="3" fill="#8B6914" stroke="#6B4F12" stroke-width="1"/>
      <rect x="47" y="126" width="26" height="6" rx="2" fill="#B8860B"/>
    </svg>
  `,
  
  ballondor: `
    <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ballonGold" x1="25" y1="10" x2="95" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFACD"/>
          <stop offset="20%" stop-color="#FFD700"/>
          <stop offset="45%" stop-color="#FFC125"/>
          <stop offset="55%" stop-color="#FFD700"/>
          <stop offset="80%" stop-color="#DAA520"/>
          <stop offset="100%" stop-color="#8B6914"/>
        </linearGradient>
        <radialGradient id="ballonShine" cx="38%" cy="35%" r="45%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
          <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
        <filter id="ballon3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
          <feOffset dx="3" dy="8" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.4" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="142" rx="30" ry="8" fill="#000" opacity="0.3"/>
      
      <!-- Ball body -->
      <circle cx="60" cy="50" r="38" fill="url(#ballonGold)" stroke="#8B6914" stroke-width="2" filter="url(#ballon3d)"/>
      
      <!-- Ball panel lines - curved for 3D effect -->
      <path d="M60 12 Q80 35 60 50 Q40 35 60 12" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.5"/>
      <path d="M22 50 Q42 30 60 50 Q42 70 22 50" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.5"/>
      <path d="M98 50 Q78 30 60 50 Q78 70 98 50" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.5"/>
      <path d="M35 25 Q60 45 85 25" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.3"/>
      <path d="M35 75 Q60 55 85 75" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.3"/>
      
      <!-- Shine -->
      <circle cx="60" cy="50" r="38" fill="url(#ballonShine)"/>
      
      <!-- Edge highlight -->
      <path d="M30 30 Q25 50 30 70" stroke="#FFFACD" stroke-width="2" fill="none" opacity="0.5"/>
      
      <!-- Stand stem -->
      <path d="M52 88 L55 100 L65 100 L68 88" fill="#B8860B" stroke="#8B6914" stroke-width="1"/>
      <rect x="54" y="95" width="12" height="10" fill="#DAA520"/>
      
      <!-- Base -->
      <ellipse cx="60" cy="118" rx="25" ry="8" fill="#8B6914" stroke="#6B4F12" stroke-width="1.5"/>
      <ellipse cx="60" cy="115" rx="22" ry="6" fill="#B8860B"/>
      <ellipse cx="60" cy="112" rx="18" ry="4" fill="#DAA520"/>
    </svg>
  `,
  
  champions: `
    <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="uclSilver" x1="20" y1="0" x2="100" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F5F5F5"/>
          <stop offset="15%" stop-color="#E8E8E8"/>
          <stop offset="30%" stop-color="#C0C0C0"/>
          <stop offset="50%" stop-color="#D8D8D8"/>
          <stop offset="70%" stop-color="#A9A9A9"/>
          <stop offset="85%" stop-color="#808080"/>
          <stop offset="100%" stop-color="#696969"/>
        </linearGradient>
        <linearGradient id="uclShine" x1="35" y1="10" x2="55" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
        </linearGradient>
        <filter id="ucl3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
          <feOffset dx="4" dy="8" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.4" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="152" rx="35" ry="8" fill="#000" opacity="0.3"/>
      
      <!-- Left ear/handle -->
      <path d="M22 30 Q2 30 2 55 Q2 80 22 80 L28 80 L28 35 Q28 30 22 30" 
            fill="url(#uclSilver)" stroke="#696969" stroke-width="1.5" filter="url(#ucl3d)"/>
      <path d="M8 45 Q8 55 15 55" stroke="#E8E8E8" stroke-width="1.5" fill="none" opacity="0.5"/>
      
      <!-- Right ear/handle -->
      <path d="M98 30 Q118 30 118 55 Q118 80 98 80 L92 80 L92 35 Q92 30 98 30" 
            fill="url(#uclSilver)" stroke="#696969" stroke-width="1.5" filter="url(#ucl3d)"/>
      <path d="M112 45 Q112 55 105 55" stroke="#E8E8E8" stroke-width="1.5" fill="none" opacity="0.5"/>
      
      <!-- Main body -->
      <path d="M28 28 L92 28 L88 105 Q60 118 32 105 Z" 
            fill="url(#uclSilver)" stroke="#696969" stroke-width="2" filter="url(#ucl3d)"/>
      
      <!-- Top rim -->
      <ellipse cx="60" cy="28" rx="32" ry="6" fill="#E8E8E8" stroke="#A9A9A9" stroke-width="1"/>
      <ellipse cx="60" cy="27" rx="28" ry="4" fill="#F5F5F5" opacity="0.5"/>
      
      <!-- Body detail lines - curved for depth -->
      <path d="M35 45 Q60 40 85 45" stroke="#A9A9A9" stroke-width="1" fill="none" opacity="0.4"/>
      <path d="M37 65 Q60 60 83 65" stroke="#A9A9A9" stroke-width="1" fill="none" opacity="0.4"/>
      <path d="M40 85 Q60 80 80 85" stroke="#A9A9A9" stroke-width="1" fill="none" opacity="0.4"/>
      
      <!-- Shine -->
      <path d="M38 35 L82 35 L78 100 Q60 110 42 100 Z" fill="url(#uclShine)" opacity="0.4"/>
      
      <!-- Edge highlight -->
      <path d="M32 35 Q28 65 35 95" stroke="#F5F5F5" stroke-width="2" fill="none" opacity="0.5"/>
      
      <!-- Base stem -->
      <rect x="52" y="110" width="16" height="18" fill="#A9A9A9" stroke="#808080" stroke-width="1"/>
      <rect x="54" y="112" width="12" height="14" fill="#C0C0C0"/>
      
      <!-- Base -->
      <ellipse cx="60" cy="135" rx="28" ry="9" fill="#808080" stroke="#606060" stroke-width="1.5"/>
      <ellipse cx="60" cy="132" rx="24" ry="7" fill="#A9A9A9"/>
      <ellipse cx="60" cy="129" rx="20" ry="5" fill="#C0C0C0"/>
    </svg>
  `,
  
  league: `
    <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="leagueSilver" x1="25" y1="0" x2="95" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F0F0F0"/>
          <stop offset="20%" stop-color="#D8D8D8"/>
          <stop offset="45%" stop-color="#C0C0C0"/>
          <stop offset="55%" stop-color="#D0D0D0"/>
          <stop offset="80%" stop-color="#A0A0A0"/>
          <stop offset="100%" stop-color="#707070"/>
        </linearGradient>
        <filter id="league3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
          <feOffset dx="3" dy="6" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.35" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="142" rx="32" ry="8" fill="#000" opacity="0.3"/>
      
      <!-- Left handle -->
      <path d="M25 32 Q8 32 8 55 Q8 78 25 78" fill="none" stroke="#A0A0A0" stroke-width="5" stroke-linecap="round" filter="url(#league3d)"/>
      <path d="M12 45 Q12 55 18 55" stroke="#D8D8D8" stroke-width="2" fill="none" opacity="0.5"/>
      
      <!-- Right handle -->
      <path d="M95 32 Q112 32 112 55 Q112 78 95 78" fill="none" stroke="#A0A0A0" stroke-width="5" stroke-linecap="round" filter="url(#league3d)"/>
      <path d="M108 45 Q108 55 102 55" stroke="#D8D8D8" stroke-width="2" fill="none" opacity="0.5"/>
      
      <!-- Main cup body -->
      <path d="M25 28 L95 28 L88 100 Q60 112 32 100 Z" 
            fill="url(#leagueSilver)" stroke="#707070" stroke-width="2" filter="url(#league3d)"/>
      
      <!-- Top rim -->
      <ellipse cx="60" cy="28" rx="35" ry="6" fill="#E0E0E0" stroke="#A0A0A0" stroke-width="1"/>
      <ellipse cx="60" cy="27" rx="30" ry="4" fill="#F0F0F0" opacity="0.6"/>
      
      <!-- Body shine -->
      <path d="M40 38 L80 38 L76 95 Q60 105 44 95 Z" fill="#FFFFFF" opacity="0.15"/>
      
      <!-- Edge highlight -->
      <path d="M30 35 Q26 65 34 90" stroke="#F0F0F0" stroke-width="2" fill="none" opacity="0.5"/>
      
      <!-- Stem -->
      <rect x="50" y="105" width="20" height="15" fill="#A0A0A0" stroke="#808080" stroke-width="1"/>
      <rect x="52" y="107" width="16" height="11" fill="#C0C0C0"/>
      
      <!-- Base -->
      <ellipse cx="60" cy="128" rx="28" ry="9" fill="#808080" stroke="#606060" stroke-width="1.5"/>
      <ellipse cx="60" cy="125" rx="24" ry="7" fill="#A0A0A0"/>
      <ellipse cx="60" cy="122" rx="20" ry="5" fill="#C0C0C0"/>
    </svg>
  `,
  
  goldenboot: `
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bootGold" x1="10" y1="15" x2="130" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFACD"/>
          <stop offset="20%" stop-color="#FFD700"/>
          <stop offset="40%" stop-color="#FFC125"/>
          <stop offset="60%" stop-color="#FFD700"/>
          <stop offset="80%" stop-color="#DAA520"/>
          <stop offset="100%" stop-color="#8B6914"/>
        </linearGradient>
        <filter id="boot3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
          <feOffset dx="3" dy="6" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.35" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="70" cy="112" rx="45" ry="6" fill="#000" opacity="0.25"/>
      
      <!-- Boot body -->
      <path d="M30 18 L65 18 L70 60 L125 68 L128 78 L128 88 L70 82 L65 100 L30 100 Z" 
            fill="url(#bootGold)" stroke="#8B6914" stroke-width="2" filter="url(#boot3d)"/>
      
      <!-- Boot details - stitches -->
      <path d="M38 30 L58 30" stroke="#FFFACD" stroke-width="2" opacity="0.5"/>
      <path d="M38 42 L58 42" stroke="#FFFACD" stroke-width="2" opacity="0.5"/>
      <path d="M38 54 L58 54" stroke="#FFFACD" stroke-width="2" opacity="0.5"/>
      
      <!-- Laces -->
      <circle cx="48" cy="24" r="3" fill="#FFFACD" stroke="#DAA520" stroke-width="1"/>
      <circle cx="48" cy="34" r="3" fill="#FFFACD" stroke="#DAA520" stroke-width="1"/>
      
      <!-- Sole -->
      <path d="M30 100 L65 100 L68 108 L28 108 Z" fill="#8B6914" stroke="#6B4F12" stroke-width="1"/>
      
      <!-- Studs -->
      <rect x="35" y="108" width="6" height="6" rx="1" fill="#6B4F12"/>
      <rect x="50" y="108" width="6" height="6" rx="1" fill="#6B4F12"/>
      
      <!-- Shine -->
      <path d="M42 25 L62 25 L67 58 L120 65 L120 72 L67 65 L62 80 L42 80 Z" fill="#FFFFFF" opacity="0.15"/>
      
      <!-- Edge highlight -->
      <path d="M35 25 Q32 50 35 85" stroke="#FFFACD" stroke-width="1.5" fill="none" opacity="0.5"/>
    </svg>
  `,
  
  worldcup: `
    <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wcGold" x1="25" y1="0" x2="95" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFACD"/>
          <stop offset="15%" stop-color="#FFD700"/>
          <stop offset="35%" stop-color="#FFC125"/>
          <stop offset="50%" stop-color="#FFD700"/>
          <stop offset="70%" stop-color="#DAA520"/>
          <stop offset="85%" stop-color="#B8860B"/>
          <stop offset="100%" stop-color="#8B6914"/>
        </linearGradient>
        <filter id="wc3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
          <feOffset dx="3" dy="8" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.4" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="152" rx="30" ry="8" fill="#000" opacity="0.3"/>
      
      <!-- Globe -->
      <circle cx="60" cy="40" r="30" fill="url(#wcGold)" stroke="#8B6914" stroke-width="2" filter="url(#wc3d)"/>
      
      <!-- Globe lines -->
      <ellipse cx="60" cy="40" rx="30" ry="10" fill="none" stroke="#FFFACD" stroke-width="1" opacity="0.4"/>
      <path d="M60 10 Q60 40 60 70" fill="none" stroke="#FFFACD" stroke-width="1" opacity="0.4"/>
      <path d="M35 25 Q60 40 85 25" fill="none" stroke="#FFFACD" stroke-width="0.8" opacity="0.3"/>
      
      <!-- Globe shine -->
      <circle cx="48" cy="30" r="10" fill="#FFFACD" opacity="0.3"/>
      
      <!-- Body -->
      <path d="M40 68 Q32 85 35 110 L85 110 Q88 85 80 68 Q60 62 40 68" 
            fill="url(#wcGold)" stroke="#8B6914" stroke-width="2" filter="url(#wc3d)"/>
      
      <!-- Body details -->
      <path d="M44 80 Q60 75 76 80" fill="none" stroke="#FFFACD" stroke-width="1" opacity="0.4"/>
      <path d="M42 95 Q60 90 78 95" fill="none" stroke="#FFFACD" stroke-width="1" opacity="0.4"/>
      
      <!-- Base ring -->
      <ellipse cx="60" cy="115" rx="22" ry="6" fill="#DAA520" stroke="#B8860B" stroke-width="1.5"/>
      
      <!-- Stem -->
      <rect x="50" y="118" width="20" height="15" fill="#B8860B" stroke="#8B6914" stroke-width="1"/>
      <rect x="52" y="120" width="16" height="11" fill="#DAA520"/>
      
      <!-- Base -->
      <ellipse cx="60" cy="140" rx="28" ry="9" fill="#8B6914" stroke="#6B4F12" stroke-width="1.5"/>
      <ellipse cx="60" cy="137" rx="24" ry="7" fill="#B8860B"/>
      <ellipse cx="60" cy="134" rx="20" ry="5" fill="#DAA520"/>
    </svg>
  `,
  
  national: `
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shieldSilver" x1="20" y1="0" x2="100" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F5F5F5"/>
          <stop offset="25%" stop-color="#E0E0E0"/>
          <stop offset="50%" stop-color="#C8C8C8"/>
          <stop offset="75%" stop-color="#A8A8A8"/>
          <stop offset="100%" stop-color="#808080"/>
        </linearGradient>
        <linearGradient id="starGold" x1="45" y1="30" x2="75" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFD700"/>
          <stop offset="50%" stop-color="#FFC125"/>
          <stop offset="100%" stop-color="#DAA520"/>
        </linearGradient>
        <filter id="shield3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
          <feOffset dx="3" dy="6" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.35" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="132" rx="30" ry="7" fill="#000" opacity="0.25"/>
      
      <!-- Shield -->
      <path d="M60 5 L100 22 L100 72 Q100 110 60 132 Q20 110 20 72 L20 22 Z" 
            fill="url(#shieldSilver)" stroke="#808080" stroke-width="2" filter="url(#shield3d)"/>
      
      <!-- Inner shield -->
      <path d="M60 15 L90 28 L90 68 Q90 100 60 118 Q30 100 30 68 L30 28 Z" 
            fill="none" stroke="#E0E0E0" stroke-width="1.5"/>
      
      <!-- Star -->
      <path d="M60 35 L65 52 L83 52 L69 62 L74 79 L60 69 L46 79 L51 62 L37 52 L55 52 Z" 
            fill="url(#starGold)" stroke="#B8860B" stroke-width="1"/>
      <path d="M60 40 L63 52 L76 52 L66 59 L70 72 L60 64 L50 72 L54 59 L44 52 L57 52 Z" 
            fill="#FFD700" opacity="0.4"/>
      
      <!-- Shield shine -->
      <path d="M35 30 Q30 60 40 95" stroke="#F5F5F5" stroke-width="2" fill="none" opacity="0.4"/>
    </svg>
  `,
  
  cup: `
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cupSilver" x1="25" y1="0" x2="95" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F0F0F0"/>
          <stop offset="20%" stop-color="#D8D8D8"/>
          <stop offset="45%" stop-color="#C0C0C0"/>
          <stop offset="55%" stop-color="#D0D0D0"/>
          <stop offset="80%" stop-color="#A0A0A0"/>
          <stop offset="100%" stop-color="#707070"/>
        </linearGradient>
        <filter id="cup3d" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
          <feOffset dx="3" dy="6" result="offsetBlur"/>
          <feFlood flood-color="#000000" flood-opacity="0.35" result="color"/>
          <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="60" cy="132" rx="30" ry="7" fill="#000" opacity="0.25"/>
      
      <!-- Left handle -->
      <path d="M28 30 Q10 30 10 52 Q10 74 28 74" fill="none" stroke="#A0A0A0" stroke-width="5" stroke-linecap="round" filter="url(#cup3d)"/>
      
      <!-- Right handle -->
      <path d="M92 30 Q110 30 110 52 Q110 74 92 74" fill="none" stroke="#A0A0A0" stroke-width="5" stroke-linecap="round" filter="url(#cup3d)"/>
      
      <!-- Main cup body -->
      <path d="M28 26 L92 26 L85 92 Q60 102 35 92 Z" 
            fill="url(#cupSilver)" stroke="#707070" stroke-width="2" filter="url(#cup3d)"/>
      
      <!-- Top rim -->
      <ellipse cx="60" cy="26" rx="32" ry="5" fill="#E0E0E0" stroke="#A0A0A0" stroke-width="1"/>
      <ellipse cx="60" cy="25" rx="28" ry="3.5" fill="#F0F0F0" opacity="0.5"/>
      
      <!-- Body shine -->
      <path d="M38 35 L82 35 L78 88 Q60 96 42 88 Z" fill="#FFFFFF" opacity="0.12"/>
      
      <!-- Edge highlight -->
      <path d="M32 32 Q28 58 36 82" stroke="#F0F0F0" stroke-width="1.5" fill="none" opacity="0.4"/>
      
      <!-- Stem -->
      <rect x="50" y="95" width="20" height="14" fill="#A0A0A0" stroke="#808080" stroke-width="1"/>
      <rect x="52" y="97" width="16" height="10" fill="#C0C0C0"/>
      
      <!-- Base -->
      <ellipse cx="60" cy="118" rx="26" ry="8" fill="#808080" stroke="#606060" stroke-width="1.5"/>
      <ellipse cx="60" cy="115" rx="22" ry="6" fill="#A0A0A0"/>
      <ellipse cx="60" cy="112" rx="18" ry="4.5" fill="#C0C0C0"/>
    </svg>
  `,
};

// Helper to get SVG as data URI
export function getTrophySvgDataUri(iconType: string): string {
  const svg = TROPHY_SVGS[iconType] || TROPHY_SVGS.league;
  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}
