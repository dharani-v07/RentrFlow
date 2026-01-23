const crypto = require('crypto');

// IMPORTANT (AI Design Principle):
// This module provides AI-assisted suggestions only.
// It MUST NOT mutate DB state or trigger FSM transitions.

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const cache = new Map();

function now() {
  return Date.now();
}

async function callOpenAIJson({ system, user, maxOutputTokens = 400 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  if (typeof fetch !== 'function') return null;

  const body = {
    model: OPENAI_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: user },
    ],
    temperature: 0.2,
    max_tokens: maxOutputTokens,
  };

  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function stableStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: now() + ttlMs });
}

function clampScore(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x);
}

function normalizeStr(x) {
  return String(x || '').trim();
}

function toList(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.map((v) => normalizeStr(v)).filter(Boolean);
  return String(x)
    .split(',')
    .map((v) => normalizeStr(v))
    .filter(Boolean);
}

function intersectionCount(a, b) {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.reduce((sum, x) => sum + (setB.has(String(x).toLowerCase()) ? 1 : 0), 0);
}

function pickTopReasons({ skillsRatio, locationMatch, years, availabilityStatus, completionRate }) {
  const parts = [];
  if (skillsRatio >= 0.7) parts.push('Strong skill match');
  else if (skillsRatio >= 0.4) parts.push('Good skill match');
  else if (skillsRatio > 0) parts.push('Partial skill match');

  if (locationMatch) parts.push('Matches service area');

  if (years >= 5) parts.push('Experienced');
  else if (years >= 2) parts.push('Moderate experience');

  if (availabilityStatus === 'Available') parts.push('Currently available');
  if (typeof completionRate === 'number' && completionRate >= 0.8) parts.push('High completion rate');

  if (parts.length === 0) return 'General match based on profile.';
  return parts.slice(0, 3).join(' · ');
}

async function suggestContractors({ job, contractors }) {
  const requiredSkills = toList(job?.requiredSkills);
  const location = normalizeStr(job?.location);

  const ranked = (Array.isArray(contractors) ? contractors : []).map((c) => {
    const skills = toList(c?.skills || c?.contractorProfile?.skills);
    const serviceAreas = toList(c?.serviceAreas || c?.contractorProfile?.serviceAreas);
    const years = Number(c?.yearsOfExperience ?? c?.contractorProfile?.yearsOfExperience ?? 0);
    const availabilityStatus = c?.availabilityStatus || c?.contractorProfile?.availabilityStatus || 'Available';
    const completionRate = typeof c?.completionRate === 'number' ? c.completionRate : null;

    const overlap = requiredSkills.length ? intersectionCount(requiredSkills, skills) : 0;
    const skillsRatio = requiredSkills.length ? overlap / requiredSkills.length : 0.5;

    const locationMatch = location
      ? serviceAreas.some((a) => a.toLowerCase().includes(location.toLowerCase()))
      : false;

    const availabilityBonus = availabilityStatus === 'Available' ? 10 : availabilityStatus === 'Busy' ? 0 : -10;

    const base = skillsRatio * 60 + (locationMatch ? 20 : 0) + Math.min(Math.max(years, 0), 10) * 2 + availabilityBonus;
    const completionBonus = completionRate != null ? (completionRate - 0.5) * 20 : 0;

    const score = clampScore(base + completionBonus);

    return {
      contractorId: String(c?._id || c?.id || ''),
      name: c?.name || c?.email || 'Contractor',
      email: c?.email || '',
      score,
      explanation: pickTopReasons({ skillsRatio, locationMatch, years, availabilityStatus, completionRate }),
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, 10);
  const openAi = await callOpenAIJson({
    system:
      'You are an assistant that ranks contractors for a job. Output strict JSON only. Never recommend actions that bypass human review.',
    user: JSON.stringify({
      task: 'Rank top 3 contractors for this job with score 0-100 and short explanation.',
      input: { job: { requiredSkills, location }, contractors: top },
      outputFormat: {
        suggestions: [
          { contractorId: 'string', name: 'string', score: 0, explanation: 'string' },
        ],
      },
    }),
    maxOutputTokens: 350,
  });

  if (openAi && Array.isArray(openAi.suggestions) && openAi.suggestions.length) {
    const safe = openAi.suggestions
      .map((x) => ({
        contractorId: String(x.contractorId || ''),
        name: String(x.name || ''),
        score: clampScore(x.score),
        explanation: String(x.explanation || ''),
      }))
      .filter((x) => x.contractorId)
      .slice(0, 3);

    if (safe.length) {
      return { provider: 'openai', suggestions: safe };
    }
  }

  return { provider: 'heuristic', suggestions: ranked.slice(0, 3) };
}

async function generateWorkOrderSummary({ jobTitle, jobDescription, contractorSkills }) {
  const title = normalizeStr(jobTitle);
  const desc = normalizeStr(jobDescription);
  const skills = toList(contractorSkills);

  const scope = desc ? `${title}: ${desc}`.slice(0, 500) : `${title}`;

  const baseTasks = [];
  if (skills.length) baseTasks.push(`Use skills: ${skills.slice(0, 5).join(', ')}`);
  baseTasks.push('Inspect site and confirm requirements');
  baseTasks.push('Execute work as per scope');
  baseTasks.push('Test, verify and share completion proof');

  const openAi = await callOpenAIJson({
    system:
      'You are an assistant that drafts a concise scope-of-work summary. Output strict JSON only. Do not include markdown.',
    user: JSON.stringify({
      task: 'Create a structured work order summary.',
      input: { title, description: desc, contractorSkills: skills },
      outputFormat: {
        summary: {
          scope: 'string',
          keyTasks: ['string'],
          expectedOutcome: 'string',
        },
      },
    }),
    maxOutputTokens: 450,
  });

  if (openAi?.summary) {
    return {
      provider: 'openai',
      summary: {
        scope: normalizeStr(openAi.summary.scope) || scope || 'Perform the requested service as described by the job.',
        keyTasks: Array.isArray(openAi.summary.keyTasks) ? openAi.summary.keyTasks.map(normalizeStr).filter(Boolean).slice(0, 10) : baseTasks,
        expectedOutcome: normalizeStr(openAi.summary.expectedOutcome) || 'Work completed and ready for verification/closure.',
      },
    };
  }

  return {
    provider: 'heuristic',
    summary: {
      scope: scope || 'Perform the requested service as described by the job.',
      keyTasks: baseTasks,
      expectedOutcome: 'Work completed and ready for verification/closure.',
    },
  };
}

async function suggestInvoiceItems({ jobTitle, contractorSkills }) {
  const title = normalizeStr(jobTitle);
  const skills = toList(contractorSkills);

  const items = [
    { description: `Labor for ${title || 'service'}`, quantity: 1, unitPriceHint: 0 },
    { description: 'Materials/Consumables', quantity: 1, unitPriceHint: 0 },
  ];

  if (skills.some((s) => s.toLowerCase().includes('elect'))) {
    items.push({ description: 'Electrical parts (wires, switches, etc.)', quantity: 1, unitPriceHint: 0 });
  }
  if (skills.some((s) => s.toLowerCase().includes('plumb'))) {
    items.push({ description: 'Plumbing parts (pipes, fittings, etc.)', quantity: 1, unitPriceHint: 0 });
  }

  const openAi = await callOpenAIJson({
    system:
      'You are an assistant that suggests invoice line items. Output strict JSON only. Do not include prices, only structure.',
    user: JSON.stringify({
      task: 'Suggest 3-6 invoice line items.',
      input: { jobTitle: title, contractorSkills: skills },
      outputFormat: { items: [{ description: 'string', quantity: 1, unitPriceHint: 0 }] },
    }),
    maxOutputTokens: 300,
  });

  if (openAi && Array.isArray(openAi.items) && openAi.items.length) {
    const safe = openAi.items
      .map((x) => ({
        description: normalizeStr(x.description),
        quantity: Number(x.quantity || 1),
        unitPriceHint: 0,
      }))
      .filter((x) => x.description)
      .slice(0, 6);

    if (safe.length) {
      return { provider: 'openai', items: safe };
    }
  }

  return { provider: 'heuristic', items: items.slice(0, 6) };
}

async function summarizeChat({ messages }) {
  const msgs = Array.isArray(messages) ? messages : [];
  const payload = msgs
    .slice(0, 25)
    .map((m) => ({ role: m.senderRole, content: normalizeStr(m.content) }))
    .filter((m) => m.content);

  const openAi = await callOpenAIJson({
    system:
      'Summarize the conversation in one sentence. Output strict JSON only as {"summary":"..."}.',
    user: JSON.stringify({ messages: payload }),
    maxOutputTokens: 80,
  });

  if (openAi?.summary) {
    return { provider: 'openai', summary: normalizeStr(openAi.summary) };
  }

  const last = msgs[0] ? normalizeStr(msgs[0].content) : '';
  const summary = last
    ? `Recent discussion: ${last.slice(0, 140)}${last.length > 140 ? '...' : ''}`
    : 'No recent messages to summarize.';

  return { provider: 'heuristic', summary };
}

async function predictJobCost({ title, description, location, similarInvoices, currency = 'INR' }) {
  const invoices = Array.isArray(similarInvoices) ? similarInvoices : [];
  const amounts = invoices
    .map((x) => Number(x?.totalAmount))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (amounts.length >= 3) {
    const mid = amounts[Math.floor(amounts.length / 2)];
    const min = Math.max(0, Math.round(mid * 0.8));
    const max = Math.max(min, Math.round(mid * 1.2));
    return {
      provider: 'heuristic',
      estimate: {
        currency,
        min,
        max,
        note: `Based on ${amounts.length} similar invoices.`,
      },
    };
  }

  const t = `${normalizeStr(title)} ${normalizeStr(description)} ${normalizeStr(location)}`.toLowerCase();
  const base = t.includes('elect') || t.includes('hvac') ? 5000 : 2000;

  return {
    provider: 'heuristic',
    estimate: {
      currency,
      min: base,
      max: base * 3,
      note: 'Low confidence (not enough historical invoice data).',
    },
  };
}

function priorityForNotification(n) {
  const type = String(n?.type || '').toUpperCase();
  const title = String(n?.title || '').toLowerCase();

  if (type === 'INVOICE') {
    if (title.includes('paid') || title.includes('submitted')) return 'HIGH';
    if (title.includes('approved') || title.includes('rejected')) return 'HIGH';
    return 'MEDIUM';
  }

  if (type === 'WORK_ORDER') {
    if (title.includes('closed')) return 'HIGH';
    return 'MEDIUM';
  }

  if (type === 'JOB') {
    if (title.includes('assigned') || title.includes('completed')) return 'MEDIUM';
    return 'LOW';
  }

  if (type === 'CHAT') return 'LOW';

  return 'LOW';
}

async function prioritizeNotifications({ notifications }) {
  const arr = Array.isArray(notifications) ? notifications : [];

  return {
    provider: 'heuristic',
    priorities: arr.map((n) => ({
      notificationId: String(n?._id || n?.id || ''),
      priority: priorityForNotification(n),
    })),
  };
}

async function withCache({ cacheKey, ttlMs, compute }) {
  const existing = cacheGet(cacheKey);
  if (existing) return { cached: true, ...existing };

  const value = await compute();
  cacheSet(cacheKey, value, ttlMs);
  return { cached: false, ...value };
}

module.exports = {
  hashPayload,
  withCache,
  suggestContractors,
  generateWorkOrderSummary,
  suggestInvoiceItems,
  summarizeChat,
  predictJobCost,
  prioritizeNotifications,
};
