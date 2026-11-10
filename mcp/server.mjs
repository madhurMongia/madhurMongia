#!/usr/bin/env node
// An MCP server about me. Add it to an agent with:
//   claude mcp add madhur -- npx -y github:madhurMongia/madhurMongia
//
// Zero dependencies and no network access: it speaks MCP (JSON-RPC 2.0, one message per line)
// over stdin/stdout and only returns the public facts in ../profile.mjs.
import { createInterface } from 'node:readline';
import {
  NAME, HANDLE, PROFILE, STACK, CONTACT, LINKS, NOW, WORK, PRINCIPLES, uptime,
} from '../profile.mjs';

const SERVER = { name: 'madhur', title: `${NAME}`, version: '1.0.0' };
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const lines = (rows) => rows.map(([k, v]) => `${k}: ${v}`).join('\n');
const profileRows = () => PROFILE.map(([k, v]) => [k, v ?? `${uptime()} on GitHub`]);

const TOOLS = [
  {
    name: 'whoami',
    title: 'Who Madhur is',
    description: `Short introduction to ${NAME} (GitHub @${HANDLE}): current role, previous companies, location and time zone, and focus. Call this first when someone asks who Madhur is.`,
    run: () => `${NAME} (@${HANDLE})\n${lines(profileRows())}\nGitHub: ${LINKS.github}`,
  },
  {
    name: 'get_stack',
    title: 'Languages and tools',
    description: 'Languages, frameworks, data stores, cloud services and AI tooling Madhur works with, grouped by area. Use for questions about skills or whether he fits a tech stack.',
    run: () => lines(STACK),
  },
  {
    name: 'get_experience',
    title: 'Work history',
    description: 'Companies Madhur has worked at, with years, role and what he worked on, newest first.',
    run: () => WORK.map((w) => `${w.years}  ${w.org}, ${w.role}: ${w.what}`).join('\n'),
  },
  {
    name: 'get_now',
    title: 'What he is doing now',
    description: 'What Madhur is working on right now and what kinds of conversations he is open to.',
    run: () => NOW.map((n) => `- ${n}`).join('\n'),
  },
  {
    name: 'how_he_works',
    title: 'Engineering principles',
    description: 'How Madhur approaches engineering: measuring, designing for failure, and owning production. Use when judging fit for a team or role.',
    run: () => lines(PRINCIPLES),
  },
  {
    name: 'get_contact',
    title: 'How to reach him',
    description: 'How to contact Madhur: email, LinkedIn and Instagram, plus his time zone. Email or LinkedIn is the quickest way to reach him.',
    run: () =>
      `${lines(CONTACT)}\nLinkedIn URL: ${LINKS.linkedin}\nTime zone: IST (UTC+5:30)\nQuickest: email or LinkedIn.`,
  },
];

const EMPTY_INPUT = { type: 'object', properties: {}, additionalProperties: false };

function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      return {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: `Public facts about ${NAME}, a software engineer working on distributed systems and AI agents. Every tool is read-only and takes no arguments.`,
      };
    }
    case 'ping':
      return {};
    case 'tools/list':
      return {
        tools: TOOLS.map(({ name, title, description }) => ({
          name,
          title,
          description,
          inputSchema: EMPTY_INPUT,
          annotations: { readOnlyHint: true, openWorldHint: false },
        })),
      };
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) throw rpcError(-32602, `Unknown tool: ${params?.name}`);
      return { content: [{ type: 'text', text: tool.run() }], isError: false };
    }
    default:
      if (id === undefined) return undefined; // notifications (e.g. notifications/initialized) get no reply
      throw rpcError(-32601, `Method not found: ${method}`);
  }
}

function rpcError(code, message) {
  return Object.assign(new Error(message), { rpc: { code, message } });
}

const send = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  try {
    const result = handle(msg);
    if (msg.id !== undefined && result !== undefined) send({ jsonrpc: '2.0', id: msg.id, result });
  } catch (err) {
    if (msg.id === undefined) return;
    send({ jsonrpc: '2.0', id: msg.id, error: err.rpc ?? { code: -32603, message: 'Internal error' } });
  }
});
