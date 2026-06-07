const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3100';
const PROFILE = process.env.PERF_PROFILE || 'load';
const PROFILE_DEFAULTS = {
  smoke: {
    duration: 5,
    concurrency: 2,
    warmup: 5,
    logins: 5,
    writes: 6,
    minRps: 1,
  },
  load: {
    duration: 20,
    concurrency: 10,
    warmup: 20,
    logins: 20,
    writes: 20,
    minRps: 10,
  },
  stress: {
    duration: 10,
    concurrency: 40,
    warmup: 20,
    logins: 30,
    writes: 30,
    minRps: 5,
  },
};

if (!PROFILE_DEFAULTS[PROFILE]) {
  throw new Error(`Unknown PERF_PROFILE: ${PROFILE}`);
}

const defaults = PROFILE_DEFAULTS[PROFILE];
const DURATION_SECONDS = numberEnv('PERF_DURATION_SECONDS', defaults.duration);
const CONCURRENCY = numberEnv('PERF_CONCURRENCY', defaults.concurrency);
const WARMUP_REQUESTS = numberEnv('PERF_WARMUP_REQUESTS', defaults.warmup);
const LOGIN_REQUESTS = numberEnv('PERF_LOGIN_REQUESTS', defaults.logins);
const LOGIN_CONCURRENCY = numberEnv('PERF_LOGIN_CONCURRENCY', 3);
const WRITE_REQUESTS = numberEnv('PERF_WRITE_REQUESTS', defaults.writes);
const WRITE_CONCURRENCY = numberEnv('PERF_WRITE_CONCURRENCY', 4);
const MAX_ERROR_RATE = numberEnv('PERF_MAX_ERROR_RATE', 0.01);
const MAX_P95_MS = numberEnv(
  'PERF_MAX_P95_MS',
  PROFILE === 'stress' ? 2000 : 750,
);
const MAX_SCENARIO_P95_MS = numberEnv(
  'PERF_MAX_SCENARIO_P95_MS',
  PROFILE === 'stress' ? 3000 : 1200,
);
const MAX_LOGIN_P95_MS = numberEnv('PERF_MAX_LOGIN_P95_MS', 1200);
const MAX_WRITE_P95_MS = numberEnv('PERF_MAX_WRITE_P95_MS', 1800);
const MIN_RPS = numberEnv('PERF_MIN_RPS', defaults.minRps);
const STRESS_STAGES = (
  process.env.PERF_STRESS_STAGES || '5,10,20,40'
)
  .split(',')
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0);

function numberEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractId(body) {
  return (
    body?.id ||
    body?.data?.id ||
    body?.file?.id ||
    body?.conversation?.id ||
    body?.appointmentId ||
    body?.data?.appointmentId
  );
}

async function requestJson(requestPath, options = {}) {
  const response = await fetch(`${BASE_URL}${requestPath}`, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(email, password) {
  const { response, body } = await requestJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = body?.accessToken || body?.data?.accessToken;

  if (!response.ok || !token) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  return token;
}

async function createPerformancePrescription(token) {
  const { response, body } = await requestJson('/prescriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appointmentId: '44444444-4444-4444-4444-444444444444',
      patientId: 'p-it-patient-001',
      dentistId: 'd-it-dentist-001',
      diagnosis: 'Performance test',
      indications: 'Performance test prescription',
    }),
  });
  const id = extractId(body);

  if (response.ok && id) return id;

  if (response.status === 409 || response.status === 400) {
    const existing = await requestJson(
      '/appointments/44444444-4444-4444-4444-444444444444/prescriptions',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const list = Array.isArray(existing.body)
      ? existing.body
      : existing.body?.data;
    if (existing.response.ok && list?.[0]?.id) return list[0].id;
  }

  throw new Error(`Prescription setup failed: ${response.status}`);
}

async function createPerformanceConversation(token) {
  const { response, body } = await requestJson('/chat/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: 'p-it-patient-001',
      dentistId: 'd-it-dentist-001',
    }),
  });
  const id = extractId(body);
  if (!response.ok || !id) {
    throw new Error(`Conversation setup failed: ${response.status}`);
  }
  return id;
}

async function uploadPerformanceFile(token) {
  const form = new FormData();
  form.append('patientId', 'p-it-patient-001');
  form.append(
    'file',
    new Blob(['%PDF-1.4 performance setup'], { type: 'application/pdf' }),
    'performance-setup.pdf',
  );
  const { response, body } = await requestJson('/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const id = extractId(body);
  if (!response.ok || !id) {
    throw new Error(
      `File setup failed: ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return id;
}

function percentile(sorted, value) {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((value / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)];
}

function summarize(name, results, elapsedMs) {
  const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
  const failures = results.filter((item) => !item.ok);
  const requests = results.length;

  return {
    name,
    requests,
    failures: failures.length,
    errorRate: requests === 0 ? 0 : failures.length / requests,
    requestsPerSecond: elapsedMs === 0 ? 0 : requests / (elapsedMs / 1000),
    latencyMs: {
      min: durations[0] || 0,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      max: durations[durations.length - 1] || 0,
    },
    statuses: results.reduce((acc, item) => {
      const key = String(item.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function timedRequest(scenario) {
  const startedAt = performance.now();

  try {
    const dynamic = scenario.buildRequest
      ? await scenario.buildRequest()
      : {};
    const response = await fetch(
      `${BASE_URL}${dynamic.path || scenario.path}`,
      {
        method: dynamic.method || scenario.method || 'GET',
        headers: dynamic.headers || scenario.headers,
        body: dynamic.body === undefined ? scenario.body : dynamic.body,
      },
    );
    await response.arrayBuffer();

    return {
      scenario: scenario.name,
      ok: scenario.expectedStatuses.includes(response.status),
      status: response.status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  } catch {
    return {
      scenario: scenario.name,
      ok: false,
      status: 0,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  }
}

async function runFixedRequests(name, scenarios, total, concurrency) {
  let cursor = 0;
  const results = [];
  const startedAt = performance.now();

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= total) return;
      results.push(await timedRequest(scenarios[index % scenarios.length]));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );
  const elapsedMs = performance.now() - startedAt;
  return {
    results,
    elapsedMs,
    summary: summarize(name, results, elapsedMs),
  };
}

async function runSustained(
  name,
  scenarios,
  durationSeconds,
  concurrency,
) {
  const results = [];
  const deadline = performance.now() + durationSeconds * 1000;
  const startedAt = performance.now();
  let cursor = 0;

  async function worker() {
    while (performance.now() < deadline) {
      results.push(
        await timedRequest(scenarios[cursor++ % scenarios.length]),
      );
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return {
    results,
    summary: summarize(name, results, performance.now() - startedAt),
  };
}

function scenarioSummaries(results, elapsedMs) {
  return Object.entries(
    results.reduce((acc, item) => {
      (acc[item.scenario] ||= []).push(item);
      return acc;
    }, {}),
  ).map(([name, items]) => summarize(name, items, elapsedMs));
}

function printSummary(summary) {
  console.log(`\n${summary.name}`);
  console.log(
    `  requests=${summary.requests} rps=${summary.requestsPerSecond.toFixed(2)} ` +
      `failures=${summary.failures} errorRate=${(summary.errorRate * 100).toFixed(2)}%`,
  );
  console.log(
    `  latency ms: p50=${summary.latencyMs.p50.toFixed(2)} ` +
      `p95=${summary.latencyMs.p95.toFixed(2)} ` +
      `p99=${summary.latencyMs.p99.toFixed(2)} max=${summary.latencyMs.max.toFixed(2)}`,
  );
}

function thresholdFailures(summary, maxP95, options = {}) {
  const failures = [];
  if (summary.errorRate > MAX_ERROR_RATE) {
    failures.push(
      `${summary.name} error rate ${summary.errorRate} > ${MAX_ERROR_RATE}`,
    );
  }
  if (summary.latencyMs.p95 > maxP95) {
    failures.push(`${summary.name} p95 ${summary.latencyMs.p95}ms > ${maxP95}ms`);
  }
  if (
    options.minRps !== undefined &&
    summary.requestsPerSecond < options.minRps
  ) {
    failures.push(
      `${summary.name} throughput ${summary.requestsPerSecond.toFixed(2)} < ` +
        `${options.minRps} rps`,
    );
  }
  return failures;
}

async function main() {
  const [patientToken, dentistToken, adminToken] = await Promise.all([
    login('patient.it@dentia.local', 'Password123!'),
    login('dentist.it@dentia.local', 'Password123!'),
    login('admin.it@dentia.local', 'Password123!'),
  ]);
  const [prescriptionId, conversationId, fileId] = await Promise.all([
    createPerformancePrescription(dentistToken),
    createPerformanceConversation(patientToken),
    uploadPerformanceFile(patientToken),
  ]);

  const auth = (token) => ({ Authorization: `Bearer ${token}` });
  const jsonAuth = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });
  const futureDate = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const readScenarios = [
    { name: 'gateway-health', path: '/health', expectedStatuses: [200] },
    {
      name: 'patient-profile',
      path: '/profile',
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    { name: 'dentists-list', path: '/dentists', expectedStatuses: [200] },
    {
      name: 'dentists-prioritized',
      path: '/dentists/prioritized',
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'dentist-ratings',
      path: '/dentists/d-it-dentist-001/ratings/summary',
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'patient-appointments',
      path: '/appointments',
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'dentist-appointments',
      path: '/appointments',
      headers: auth(dentistToken),
      expectedStatuses: [200],
    },
    {
      name: 'dentist-day',
      path: `/appointments/day?date=${futureDate}`,
      headers: auth(dentistToken),
      expectedStatuses: [200],
    },
    {
      name: 'availability',
      path: `/appointments/availability?dentistId=d-it-dentist-001&date=${futureDate}`,
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'patient-files',
      path: '/files',
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'file-metadata',
      path: `/files/${fileId}`,
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'file-download',
      path: `/files/${fileId}/download`,
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'patient-chat',
      path: '/chat/conversations',
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'chat-messages',
      path: `/chat/conversations/${conversationId}/messages?limit=20`,
      headers: auth(patientToken),
      expectedStatuses: [200],
    },
    {
      name: 'dentist-prescription',
      path: `/prescriptions/${prescriptionId}`,
      headers: auth(dentistToken),
      expectedStatuses: [200],
    },
    {
      name: 'prescription-pdf',
      path: `/prescriptions/${prescriptionId}/pdf`,
      headers: auth(dentistToken),
      expectedStatuses: [200],
    },
    {
      name: 'dentist-reports',
      path: '/reports/dashboard/summary',
      headers: auth(dentistToken),
      expectedStatuses: [200],
    },
    {
      name: 'admin-reports',
      path: '/reports/appointments/by-status',
      headers: auth(adminToken),
      expectedStatuses: [200],
    },
    {
      name: 'reports-csv',
      path: '/reports/export/appointments-by-status',
      headers: auth(adminToken),
      expectedStatuses: [200],
    },
  ];

  let messageCounter = 0;
  let appointmentCounter = 0;
  let uploadCounter = 0;
  const writeScenarios = [
    {
      name: 'send-chat-message',
      expectedStatuses: [200, 201],
      buildRequest: () => ({
        path: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        headers: jsonAuth(patientToken),
        body: JSON.stringify({
          body: `Performance message ${Date.now()}-${messageCounter++}`,
        }),
      }),
    },
    {
      name: 'mark-chat-read',
      path: `/chat/conversations/${conversationId}/read`,
      method: 'PATCH',
      headers: auth(dentistToken),
      expectedStatuses: [200],
    },
    {
      name: 'create-appointment',
      expectedStatuses: [200, 201],
      buildRequest: () => {
        const start = new Date(
          Date.now() + (90 + appointmentCounter++) * 86400000,
        );
        start.setUTCHours(15, 0, 0, 0);
        const end = new Date(start.getTime() + 30 * 60000);
        return {
          path: '/appointments',
          method: 'POST',
          headers: jsonAuth(patientToken),
          body: JSON.stringify({
            dentistId: 'd-it-dentist-001',
            startAt: start.toISOString(),
            endAt: end.toISOString(),
          }),
        };
      },
    },
    {
      name: 'upload-clinical-file',
      expectedStatuses: [200, 201],
      buildRequest: () => {
        const form = new FormData();
        form.append('patientId', 'p-it-patient-001');
        form.append(
          'file',
          new Blob([`%PDF-1.4 performance ${uploadCounter}`], {
            type: 'application/pdf',
          }),
          `performance-${uploadCounter++}.pdf`,
        );
        return {
          path: '/files',
          method: 'POST',
          headers: auth(patientToken),
          body: form,
        };
      },
    },
  ];

  const loginScenarios = [
    {
      name: 'patient-login',
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient.it@dentia.local',
        password: 'Password123!',
      }),
      expectedStatuses: [200],
    },
  ];

  console.log(
    `Performance profile=${PROFILE} duration=${DURATION_SECONDS}s ` +
      `concurrency=${CONCURRENCY}`,
  );
  await runFixedRequests(
    'warmup',
    readScenarios,
    WARMUP_REQUESTS,
    Math.min(CONCURRENCY, 5),
  );

  const sustainedStages = [];
  if (PROFILE === 'stress') {
    for (const stageConcurrency of STRESS_STAGES) {
      const stage = await runSustained(
        `stress-${stageConcurrency}-workers`,
        readScenarios,
        DURATION_SECONDS,
        stageConcurrency,
      );
      sustainedStages.push(stage);
      printSummary(stage.summary);
    }
  } else {
    const stage = await runSustained(
      'sustained-read-load',
      readScenarios,
      DURATION_SECONDS,
      CONCURRENCY,
    );
    sustainedStages.push(stage);
    printSummary(stage.summary);
  }

  const loginBurst = await runFixedRequests(
    'login-burst',
    loginScenarios,
    LOGIN_REQUESTS,
    LOGIN_CONCURRENCY,
  );
  const writeBurst = await runFixedRequests(
    'write-burst',
    writeScenarios,
    WRITE_REQUESTS,
    WRITE_CONCURRENCY,
  );
  printSummary(loginBurst.summary);
  printSummary(writeBurst.summary);

  const allReadResults = sustainedStages.flatMap((stage) => stage.results);
  const readElapsedMs = DURATION_SECONDS * sustainedStages.length * 1000;
  const readScenariosSummary = scenarioSummaries(
    allReadResults,
    readElapsedMs,
  );
  const writeScenariosSummary = scenarioSummaries(
    writeBurst.results,
    writeBurst.elapsedMs,
  );
  readScenariosSummary.forEach(printSummary);
  writeScenariosSummary.forEach(printSummary);

  const report = {
    generatedAt: new Date().toISOString(),
    profile: PROFILE,
    configuration: {
      baseUrl: BASE_URL,
      durationSeconds: DURATION_SECONDS,
      concurrency: CONCURRENCY,
      stressStages: PROFILE === 'stress' ? STRESS_STAGES : [],
      loginRequests: LOGIN_REQUESTS,
      writeRequests: WRITE_REQUESTS,
      thresholds: {
        maxErrorRate: MAX_ERROR_RATE,
        maxP95Ms: MAX_P95_MS,
        maxScenarioP95Ms: MAX_SCENARIO_P95_MS,
        maxLoginP95Ms: MAX_LOGIN_P95_MS,
        maxWriteP95Ms: MAX_WRITE_P95_MS,
        minRequestsPerSecond: MIN_RPS,
      },
    },
    readStages: sustainedStages.map((stage) => stage.summary),
    loginBurst: loginBurst.summary,
    writeBurst: writeBurst.summary,
    readScenarios: readScenariosSummary,
    writeScenarios: writeScenariosSummary,
  };

  const outputDir = path.resolve(
    process.env.PERF_RESULTS_DIR || 'performance-results',
  );
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `performance-${PROFILE}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nReport: ${outputPath}`);

  const failures = [
    ...sustainedStages.flatMap((stage) =>
      thresholdFailures(stage.summary, MAX_P95_MS, { minRps: MIN_RPS }),
    ),
    ...thresholdFailures(loginBurst.summary, MAX_LOGIN_P95_MS),
    ...thresholdFailures(writeBurst.summary, MAX_WRITE_P95_MS),
    ...readScenariosSummary.flatMap((summary) =>
      thresholdFailures(summary, MAX_SCENARIO_P95_MS),
    ),
    ...writeScenariosSummary.flatMap((summary) =>
      thresholdFailures(summary, MAX_WRITE_P95_MS),
    ),
  ];

  if (failures.length > 0) {
    throw new Error(`Performance thresholds failed: ${failures.join('; ')}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
