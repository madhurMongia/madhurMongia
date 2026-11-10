// Public facts about me, shared by the profile card (scripts/card.mjs) and the MCP server (mcp/server.mjs).
// Only put things here that are fine to show anyone.

export const NAME = 'Madhur Mongia';
export const HANDLE = 'madhurMongia';
export const HOST = 'madhur@mongia';
export const GITHUB_SINCE = '2019-05-31';

export const PROFILE = [
  ['Work', 'PepsiCo, backend'],
  ['Before', 'Kleros, Samsung R&D, Ringover'],
  ['Location', 'Gurgaon, IN (UTC+5:30)'],
  ['Uptime', null], // filled from GITHUB_SINCE
  ['Focus', 'distributed systems, agentic workflows'],
];

export const STACK = [
  ['Languages', 'TypeScript, Java, Python, SQL'],
  ['Backend', 'Node.js, NestJS, Spring Boot'],
  ['Data', 'Kafka, PostgreSQL, Redis, Couchbase'],
  ['Cloud', 'AWS ECS, MSK, SQS'],
  ['AI', 'agents, MCP, tool calling, evals'],
  ['Frontend', 'React, Next.js'],
];

export const CONTACT = [
  ['Email', 'madhurmongia33@gmail.com'],
  ['LinkedIn', 'in/madhurmongia'],
  ['Instagram', 'madhur._r'],
];

export const LINKS = {
  email: 'mailto:madhurmongia33@gmail.com',
  linkedin: 'https://www.linkedin.com/in/madhurmongia',
  github: 'https://github.com/madhurMongia',
  instagram: 'https://www.instagram.com/madhur._r',
};

export const NOW = [
  "Day job: event-driven services on PepsiCo's loyalty platform (Java, Node.js, Kafka).",
  'After hours: building AI agents with tool calling, MCP and evals.',
  'Open to: conversations about distributed systems and agentic workflows.',
];

export const WORK = [
  { years: '2026-now', org: 'PepsiCo', role: 'Senior Software Engineer', what: 'loyalty platform: Shopify bridge, Kafka, Postgres outbox' },
  { years: '2024-2026', org: 'Kleros', role: 'Senior Full Stack Engineer', what: 'Proof of Humanity v2: web app, contracts, subgraphs, bots' },
  { years: '2023-2024', org: 'Samsung R&D', role: 'Software Engineer', what: 'event-processing pipelines, Elasticsearch tiering' },
  { years: '2022-2023', org: 'Ringover', role: 'Backend Engineer', what: 'CRM integrations, real-time notifications' },
];

export const PRINCIPLES = [
  ['measure', 'benchmarks, load tests and production data first'],
  ['fail well', 'outboxes, idempotent handlers, circuit breakers, crash-safe jobs'],
  ['own it', 'structured logs, runbooks, root-cause analysis'],
];

export function uptime(since = GITHUB_SINCE, now = new Date()) {
  const c = new Date(since);
  let months = (now.getUTCFullYear() - c.getUTCFullYear()) * 12 + (now.getUTCMonth() - c.getUTCMonth());
  if (now.getUTCDate() < c.getUTCDate()) months--;
  const y = Math.floor(months / 12), m = months % 12;
  const part = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return m ? `${part(y, 'year')}, ${part(m, 'month')}` : part(y, 'year');
}
