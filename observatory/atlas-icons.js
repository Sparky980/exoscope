/* Original vector studies for the object atlas. Each illustration owns its gradient IDs. */
const studies = {
  comet: {
    colors: ['#fff5c6','#ffb06e','#90504b'],
    art: `
      <path fill="url(#comet-tail)" d="M54 61C78 39 124 20 184 6 139 32 113 54 64 72Z"/>
      <path fill="url(#comet-tail)" opacity=".6" d="M56 65C96 57 138 54 184 24 151 58 107 72 60 72Z"/>
      <path d="M61 64Q107 37 166 16M67 67Q130 53 161 35" stroke="#ffd6a3" opacity=".64"/>
      <circle cx="56" cy="67" r="17" fill="url(#comet-halo)"/><circle cx="56" cy="67" r="7" fill="url(#comet-body)"/>
      <path d="M46 65q-2 9 7 12" stroke="#e8bd91" opacity=".8"/>`
  },
  rock: {
    colors: ['#ffdcaa','#be9479','#4a4d59'],
    art: `
      <path d="M57 52 66 31 88 19 110 23 130 40 134 58 120 74 94 80 72 71Z" fill="url(#rock-body)" stroke="#bfac96"/>
      <path d="m67 32 20-10-10 15-16 15z" fill="#ffe0b0" opacity=".44"/><path d="m114 25 16 15 4 18-14 16-23 6 18-15 6-23z" fill="#283541" opacity=".45"/>
      <g transform="rotate(-24 91 45)"><ellipse cx="91" cy="45" rx="13" ry="9" fill="#705e55"/><path d="M78 45c0 9 23 13 26 1" stroke="#e4bd97" stroke-width="2"/></g>
      <ellipse cx="110" cy="60" rx="7" ry="4" fill="#6a5b55"/><ellipse cx="77" cy="59" rx="4" ry="3" fill="#8f7662"/>
      <path d="m59 48 6-9m33-14 8 2m-9 45 8-3" stroke="#e9c6a9" opacity=".7"/>
      <path d="M31 70Q41 78 64 81M131 25Q148 29 157 39" stroke="#87776c" stroke-dasharray="2 5"/>`
  },
  star: {
    colors: ['#fffde1','#ffc778','#bf6845'],
    art: `
      <circle cx="96" cy="47" r="41" fill="url(#star-halo)"/>
      <g fill="#ffd89b"><path d="m96 3 2 34 9 9 32 2-32 2-9 9-2 33-2-33-9-9-32-2 32-2 9-9z"/><path d="m66 18 26 23 8 1 23-20-20 25 1 7 19 23-26-21-7-1-22 20 18-24v-7z" opacity=".68"/></g>
      <circle cx="96" cy="48" r="12" fill="url(#star-body)"/><circle cx="94" cy="45" r="5" fill="#fff9d5"/>`
  },
  cloud: {
    colors: ['#f6bdc8','#ab8fb9','#457c93'],
    art: `
      <path d="M37 58C42 38 60 44 69 29S92 18 101 28s25-14 42 1 12 32-6 38-28 2-36 11-27 2-37-5-18-1-27-15Z" fill="url(#cloud-body)" opacity=".73"/>
      <path d="M45 61c17-28 30-5 40-28s18-9 30-7M65 70c18 1 16-18 31-16s20-24 41-16M87 75c18-14 32 1 53-22" stroke="#dbaabd" stroke-width="3" opacity=".66"/>
      <path d="M58 60c15-20 24 5 40-24M87 72c9-24 27-8 39-27" stroke="#254456" stroke-width="5" opacity=".75"/>
      <path d="m99 39 1.5 6 6 1.5-6 1.5-1.5 6-1.5-6-6-1.5 6-1.5z" fill="#ffe8c7"/><circle cx="109" cy="47" r="1.6" fill="#fff3df"/>`
  },
  quasar: {
    colors: ['#fff6dd','#c6a8ef','#6b74a9'],
    art: `
      <g transform="rotate(28 96 48)"><path d="M90 47 83 2 94 12 98 43 105 13 103 3 108 7 102 49Z" fill="url(#quasar-body)" opacity=".78"/>
      <path d="m93 50 9 36 4 7-4-42z" fill="#96a4e1" opacity=".67"/>
      <ellipse cx="96" cy="50" rx="36" ry="10" fill="url(#quasar-body)" opacity=".9"/>
      <ellipse cx="96" cy="50" rx="26" ry="6" stroke="#f4d7ff"/><ellipse cx="96" cy="50" rx="12" ry="3" fill="#ffead3"/>
      <path d="M97 47Q92 23 88 9M99 53l5 30" stroke="#eff2ff" stroke-width="2"/></g>`
  },
  pulse: {
    colors: ['#f4ffff','#81dfe2','#40768f'],
    art: `
      <g transform="rotate(-31 95 48)"><path d="m93 43-9-37 18 2-6 36zm4 10 9 34-16-2 4-32z" fill="url(#pulse-body)" opacity=".7"/>
      <g stroke="#82ccd6" opacity=".75"><path d="M93 39C47 2 51 76 93 56M98 39c44-35 42 36 0 17M93 40c-29-24-29 29 0 13M98 40c27-25 28 28 0 14"/></g>
      <circle cx="95" cy="48" r="11" fill="url(#pulse-body)"/><path d="M90 44q5-4 10 0" stroke="#e1ffff"/></g>`
  },
  blackhole: {
    colors: ['#ffeab3','#e79160','#975b70'],
    art: `
      <g transform="rotate(-9 95 49)"><ellipse cx="95" cy="54" rx="60" ry="11" fill="#885059" opacity=".47"/>
      <path d="M39 53Q64 50 70 38C83 10 115 17 121 42Q123 51 151 55L127 54C111 51 113 28 95 28S78 50 63 53Z" fill="url(#blackhole-body)"/>
      <circle cx="95" cy="49" r="18" fill="#09111b"/><path d="M36 53c26 0 38 9 61 8s42-4 57-8c-16 11-44 15-65 12s-39-7-53-12Z" fill="url(#blackhole-body)"/>
      <path d="M48 55q48 11 96 0M75 39c9-21 32-24 41-2" stroke="#ffeac4" stroke-width="1.6"/></g>`
  },
  transit: {
    colors: ['#fff3b9','#efb77c','#997a8c'],
    art: `
      <circle cx="92" cy="46" r="35" fill="url(#transit-halo)"/><circle cx="92" cy="46" r="27" fill="url(#transit-body)"/>
      <path d="M70 38q11-6 21-2M84 62q12 4 23-5" stroke="#ffdeb0" stroke-width="2" opacity=".53"/>
      <path d="M30 68 149 28" stroke="#add7db" stroke-dasharray="3 5" opacity=".8"/>
      <circle cx="102" cy="44" r="9" fill="#14232d" stroke="#efd5ad" stroke-width="1"/><path d="M98 37q6-3 11 3" stroke="#91ccd4" stroke-width="1.6"/>`
  }
};

export function objectIcon(key) {
  const {colors:[light,mid,dark],art}=studies[key];
  return `<svg class="diagram" viewBox="0 0 192 96" fill="none" aria-hidden="true" focusable="false" stroke-linecap="round" stroke-linejoin="round">
    <defs>
      <radialGradient id="${key}-body" cx="30%" cy="26%" r="82%"><stop stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
      <radialGradient id="${key}-halo"><stop stop-color="${mid}" stop-opacity=".44"/><stop offset="1" stop-color="${mid}" stop-opacity="0"/></radialGradient>
      ${key==='comet'?'<linearGradient id="comet-tail" x1="0%" y1="90%" x2="100%" y2="0%"><stop stop-color="#ffcf95"/><stop offset=".56" stop-color="#e5a488" stop-opacity=".65"/><stop offset="1" stop-color="#b591a8" stop-opacity="0"/></linearGradient>':''}
    </defs>${art}</svg>`;
}
