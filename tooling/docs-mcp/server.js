#!/usr/bin/env node

const {
  checkDocLinks,
  detectStaleDocs,
  draftReadmeFromSource,
  extractAppMetadataFromReadme,
  refineReadme,
  suggestTranslation,
} = require('./lib');

const tools = [
  {
    name: 'draft_readme_from_source',
    description: 'Generate a README draft outline from source files.',
    inputSchema: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
      },
      required: ['paths'],
    },
  },
  {
    name: 'extract_app_metadata_from_readme',
    description: 'Extract app metadata suggestions from a README for docs publishing.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        markdown: { type: 'string' },
      },
    },
  },
  {
    name: 'refine_readme',
    description: 'Suggest structural improvements for an existing README.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
      },
      required: ['path'],
    },
  },
  {
    name: 'check_doc_links',
    description: 'Check local markdown documentation links for missing files.',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string' },
      },
    },
  },
  {
    name: 'detect_stale_docs',
    description: 'Find README files that are not referenced by documentation files.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceRoot: { type: 'string' },
        docsRoot: { type: 'string' },
      },
    },
  },
  {
    name: 'suggest_translation',
    description: 'Create a reviewable translation draft placeholder for markdown content.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string' },
        targetLocale: { type: 'string' },
      },
    },
  },
];

const handlers = {
  draft_readme_from_source: draftReadmeFromSource,
  extract_app_metadata_from_readme: extractAppMetadataFromReadme,
  refine_readme: refineReadme,
  check_doc_links: checkDocLinks,
  detect_stale_docs: detectStaleDocs,
  suggest_translation: suggestTranslation,
};

let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});

function readMessages() {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const header = buffer.slice(0, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const length = Number(match[1]);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + length;
    if (buffer.length < messageEnd) return;

    const raw = buffer.slice(messageStart, messageEnd).toString('utf8');
    buffer = buffer.slice(messageEnd);
    handleMessage(JSON.parse(raw));
  }
}

async function handleMessage(message) {
  if (message.method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'webfudge-docs-mcp', version: '0.1.0' },
      },
    });
  }

  if (message.method === 'tools/list') {
    return send({ jsonrpc: '2.0', id: message.id, result: { tools } });
  }

  if (message.method === 'tools/call') {
    const { name, arguments: args = {} } = message.params || {};
    const handler = handlers[name];

    if (!handler) {
      return send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Unknown tool: ${name}` } });
    }

    try {
      const result = await handler(args);
      return send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
        },
      });
    } catch (err) {
      return send({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: err.message } });
    }
  }

  if (message.id != null) {
    send({ jsonrpc: '2.0', id: message.id, result: {} });
  }
}

function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}
