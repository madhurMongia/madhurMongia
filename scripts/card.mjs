// Renders the neofetch-style profile card (card-dark.svg, card-light.svg) with live GitHub numbers.
// Usage: GITHUB_TOKEN=... node scripts/card.mjs <login> <outDir>
// CARD_RAW=<file> caches the API response so the layout can be re-rendered offline.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [login = 'madhurMongia', outDir = 'dist'] = process.argv.slice(2);

// The facts on the card live in profile.mjs, shared with the MCP server.
import { HOST, PROFILE, STACK, CONTACT, uptime } from '../profile.mjs';

const QUERY = `query($login:String!){user(login:$login){
  createdAt followers{totalCount}
  repositories(ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC,first:100){totalCount nodes{stargazerCount}}
  repositoriesContributedTo(includeUserRepositories:false,contributionTypes:[COMMIT,PULL_REQUEST,REPOSITORY]){totalCount}
  contributionsCollection{totalCommitContributions restrictedContributionsCount contributionCalendar{totalContributions}}
}}`;

async function fetchUser() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-card' },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  return json.data.user;
}

export function stats(u) {
  const cc = u.contributionsCollection;
  return {
    uptime: uptime(u.createdAt),
    repos: u.repositories.totalCount,
    contributed: u.repositoriesContributedTo.totalCount,
    stars: u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
    followers: u.followers.totalCount,
    commits: cc.totalCommitContributions,
    contributions: cc.contributionCalendar.totalContributions,
  };
}

const THEMES = {
  dark: { bg: '#0d1117', border: '#30363d', art: '#8b949e', key: '#ffa657', value: '#a5d6ff', dots: '#484f58', text: '#c9d1d9' },
  light: { bg: '#ffffff', border: '#d0d7de', art: '#57606a', key: '#953800', value: '#0a3069', dots: '#afb8c1', text: '#24292f' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => n.toLocaleString('en-US');
const fonts = () =>
  [400, 700]
    .map((w) => {
      const b64 = readFileSync(join(root, 'scripts/fonts', `jetbrains-mono-${w}.woff2`)).toString('base64');
      return `@font-face{font-family:'JBM';font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
    })
    .join('');

const WIDTH = 50; // info column, characters

// A line is a list of [class, text] runs.
function kv(key, value, width = WIDTH) {
  const dots = Math.max(2, width - key.length - 2 - String(value).length - 1);
  return [['k', key], ['t', ': '], ['d', '.'.repeat(dots) + ' '], ['v', String(value)]];
}
function pair(a, b) {
  // Two key/value pairs on one line, split by " | ".
  const left = 29, right = WIDTH - left - 3;
  return [...kv(a[0], a[1], left), ['d', ' | '], ...kv(b[0], b[1], right)];
}
const section = (title) => [['t', `- ${title} ${'-'.repeat(WIDTH - title.length - 3)}`]];

export function lines(s) {
  const profile = PROFILE.map(([k, v]) => kv(k, v ?? s.uptime));
  return [
    [['h', HOST]],
    [['t', '-'.repeat(WIDTH)]],
    ...profile,
    [],
    section('Stack'),
    ...STACK.map(([k, v]) => kv(k, v)),
    [],
    section('Contact'),
    ...CONTACT.map(([k, v]) => kv(k, v)),
    [],
    section('GitHub'),
    pair(['Repos', `${s.repos} {+${s.contributed}}`], ['Stars', s.stars]),
    pair(['Commits (1y)', fmt(s.commits)], ['Followers', s.followers]),
    kv('Contributions (1y)', fmt(s.contributions)),
  ];
}

export function render(s, themeName) {
  const c = THEMES[themeName];
  const art = readFileSync(join(root, 'assets', `portrait-${themeName}.txt`), 'utf8').replace(/\n+$/, '').split('\n');

  const PAD = 28;
  const ART_FS = 11, ART_LH = ART_FS * 1.2, ART_CW = ART_FS * 0.6;
  const FS = 16, LH = 22, CW = FS * 0.6;
  const artW = Math.max(...art.map((l) => l.length)) * ART_CW;
  const artH = art.length * ART_LH;
  const info = lines(s);
  const promptLine = info.length + 1; // blank line, then the prompt
  const infoH = (promptLine + 1) * LH;
  const H = Math.ceil(Math.max(artH, infoH) + PAD * 2);
  const infoX = Math.round(PAD + artW + 36);
  const W = Math.ceil(infoX + WIDTH * CW + PAD);
  const artY = PAD + (H - PAD * 2 - artH) / 2;
  const infoY = PAD + (H - PAD * 2 - infoH) / 2;

  const artText = art
    .map((l, i) => `<tspan x="${PAD}" y="${(artY + ART_FS + i * ART_LH).toFixed(1)}">${esc(l)}</tspan>`)
    .join('');
  const infoText = info
    .map((runs, i) =>
      runs.length
        ? `<text x="${infoX}" y="${infoY + FS + i * LH}">${runs.map(([cls, t]) => `<tspan class="${cls}">${esc(t)}</tspan>`).join('')}</text>`
        : ''
    )
    .join('\n');
  const py = infoY + FS + promptLine * LH;
  const prompt = `${HOST}:~$ `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${HOST}</title>
<desc id="d">ASCII portrait of Madhur Mongia beside a neofetch-style summary. ${esc(
    [...PROFILE.map(([k, v]) => `${k}: ${v ?? s.uptime}`), ...STACK.map(([k, v]) => `${k}: ${v}`), ...CONTACT.map(([k, v]) => `${k}: ${v}`)].join('. ')
  )}. Public repos: ${s.repos}, stars: ${s.stars}, followers: ${s.followers}, commits in the last year: ${fmt(s.commits)}, contributions in the last year: ${fmt(s.contributions)}.</desc>
<style>
${fonts()}
text{font-family:'JBM',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:${FS}px;white-space:pre;fill:${c.text}}
.art{font-size:${ART_FS}px;fill:${c.art}}
.h{fill:${c.key};font-weight:700}.k{fill:${c.key}}.v{fill:${c.value}}.d{fill:${c.dots}}.t{fill:${c.text}}
.cur{fill:${c.text};animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion: reduce){.cur{animation:none}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="${c.bg}" stroke="${c.border}"/>
<text class="art" xml:space="preserve">${artText}</text>
${infoText}
<text x="${infoX}" y="${py}"><tspan class="h">${esc(HOST)}</tspan><tspan class="t">:~$ </tspan></text>
<rect class="cur" x="${infoX + prompt.length * CW}" y="${py - FS + 2}" width="${CW}" height="${FS + 2}"/>
</svg>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.CARD_RAW;
  let user;
  if (raw && existsSync(raw)) user = JSON.parse(readFileSync(raw, 'utf8'));
  else {
    user = await fetchUser();
    if (raw) writeFileSync(raw, JSON.stringify(user));
  }
  const s = stats(user);
  mkdirSync(outDir, { recursive: true });
  for (const name of Object.keys(THEMES)) {
    const svg = render(s, name);
    writeFileSync(join(outDir, `card-${name}.svg`), svg);
    console.log(`card-${name}.svg ${(svg.length / 1024).toFixed(1)} KB`);
  }
  console.log(JSON.stringify(s));
}
