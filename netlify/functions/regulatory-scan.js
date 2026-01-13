// netlify/functions/regulatory-scan.js
// Scheduled function to scan regulatory sources for updates

export default async (request, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const ANTHROPIC_API_KEY = Netlify.env.get('ANTHROPIC_API_KEY');

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: 'ANTHROPIC_API_KEY not configured',
    }), { status: 500, headers });
  }

  // Regulatory sources to scan
  const sources = [
    {
      id: 'hipaa-security',
      name: 'HHS HIPAA Security Rule',
      framework: 'HIPAA_SECURITY',
      keywords: ['HIPAA', 'security rule', 'MFA', 'authentication', '2026'],
    },
    {
      id: 'eu-ai-act',
      name: 'EU AI Act',
      framework: 'EU_AI_ACT',
      keywords: ['AI Act', 'high-risk AI', 'transparency', 'conformity assessment'],
    },
    {
      id: 'nist-pqc',
      name: 'NIST Post-Quantum Cryptography',
      framework: 'NIST_800_53',
      keywords: ['post-quantum', 'CRYSTALS-Kyber', 'PQC', 'migration'],
    },
  ];

  const results = [];
  const lastScanDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const source of sources) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: `You are a Regulatory Compliance Intelligence Agent specializing in cybersecurity, data privacy, and AI governance regulations.

Your mission is to scan official regulatory sources and identify changes, updates, and new requirements that could impact organizations' compliance posture.

Focus on:
1. New requirements or amendments
2. Enforcement guidance or actions
3. Deadline changes
4. 2026-specific updates (AI transparency, quantum readiness, zero trust)

Output only valid JSON.`,
          messages: [{
            role: 'user',
            content: `Scan for regulatory updates from ${source.name}.
Keywords to search: ${source.keywords.join(', ')}
Framework: ${source.framework}
Look for changes since: ${lastScanDate}

Search the web for recent updates, guidance documents, or announcements.

Return a JSON array of changes found:
[
  {
    "changeId": "unique-id",
    "sourceUrl": "URL",
    "publishedDate": "YYYY-MM-DD",
    "frameworkType": "${source.framework}",
    "affectedSections": ["section codes"],
    "changeType": "new_requirement|amendment|clarification|enforcement_guidance",
    "changeSummary": "Brief summary",
    "changeDetails": "Detailed description",
    "estimatedImpact": "critical|high|medium|low",
    "affectedControlFamilies": ["family names"],
    "suggestedActions": ["action items"],
    "aiConfidenceScore": 0-100,
    "requiresHumanReview": true|false
  }
]

If no changes found, return: []`
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let content = '';
        for (const block of data.content) {
          if (block.type === 'text') content += block.text;
        }

        // Parse JSON from response
        let changes = [];
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            changes = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse changes:', parseError);
        }

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          framework: source.framework,
          status: 'completed',
          changesFound: changes.length,
          changes,
        });
      } else {
        const errorText = await response.text();
        results.push({
          sourceId: source.id,
          status: 'failed',
          error: errorText,
        });
      }
    } catch (error) {
      results.push({
        sourceId: source.id,
        status: 'failed',
        error: error.message,
      });
    }
  }

  // Calculate summary
  const totalChanges = results.reduce((sum, r) => sum + (r.changesFound || 0), 0);
  const criticalChanges = results
    .flatMap(r => r.changes || [])
    .filter(c => c.estimatedImpact === 'critical').length;

  return new Response(JSON.stringify({
    success: true,
    scannedAt: new Date().toISOString(),
    summary: {
      sourcesScanned: sources.length,
      totalChangesDetected: totalChanges,
      criticalChanges,
    },
    results,
  }), { status: 200, headers });
};

// Schedule: Run every Monday at 6 AM UTC
export const config = {
  schedule: '0 6 * * 1',
  path: '/api/regulatory-scan',
};
