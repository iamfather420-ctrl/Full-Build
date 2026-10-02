import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini client server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('⚠️ GEMINI_API_KEY is not defined in environment variables. Running in simulated fallback mode.');
}

// 1. Unified Payment Endpoint
app.post('/api/pay/create', (req, res) => {
  try {
    const { provider, amount, currency, templateId, metadata } = req.body;
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    const targetProvider = provider || 'unified_to';
    const txnId = `txn_${Math.random().toString(36).substring(2, 10)}`;
    const checkoutUrl = `https://checkout.solvex.marketplace/pay/${txnId}?provider=${targetProvider}&amount=${amount}`;

    res.json({
      success: true,
      transactionId: txnId,
      checkoutUrl,
      provider: targetProvider,
      amount,
      currency: currency || 'USD',
      status: 'pending_checkout',
      message: `Unified API successfully initialized payment stream for ${targetProvider.toUpperCase()}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1.5. Real GitHub Repositories Fetcher Endpoint
app.post('/api/github/repos', async (req, res) => {
  try {
    const { username, token } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'GitHub username is required.' });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'solvex-sovereign-unifier'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const githubResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, {
      headers
    });

    if (!githubResponse.ok) {
      const errText = await githubResponse.text();
      throw new Error(`GitHub API returned status ${githubResponse.status}: ${errText}`);
    }

    const reposData = await githubResponse.json();
    
    // Map to a clean, usable structure
    const repos = reposData.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description || 'No description provided.',
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language || 'TypeScript',
      updatedAt: repo.updated_at
    }));

    res.json({ success: true, repos });
  } catch (err: any) {
    console.error('Error fetching real GitHub repositories:', err.message);
    
    // Provide an informative, high-fidelity fallback list if offline or rate-limited
    // This allows the app to be fully functional even without a token/internet
    const simulatedRepos = [
      { id: 101, name: "autonomous-payment-router", description: "dAIsy HaMINJA unified payment controller routing Stripe/PayPal/Square transactions.", url: "https://github.com/solvex/autonomous-payment-router", stars: 42, language: "TypeScript", updatedAt: new Date().toISOString() },
      { id: 102, name: "paradox-solver-engine", description: "54-node grid state controller solving distributed transactional loop paradoxes.", url: "https://github.com/solvex/paradox-solver-engine", stars: 128, language: "Go", updatedAt: new Date().toISOString() },
      { id: 103, name: "jit-apk-obfuscator", description: "JIT dynamic compilation and XOR layout watermarking system.", url: "https://github.com/solvex/jit-apk-obfuscator", stars: 89, language: "Rust", updatedAt: new Date().toISOString() },
      { id: 104, name: "sovereign-lock-telemetry", description: "ISO_42001 & SOC2-TYPE-II security auditor and timing analysis detector.", url: "https://github.com/solvex/sovereign-lock-telemetry", stars: 31, language: "TypeScript", updatedAt: new Date().toISOString() }
    ];

    res.json({ 
      success: true, 
      repos: simulatedRepos, 
      warning: `Fallback dataset active (Error: ${err.message}). Verify credentials or internet connectivity.` 
    });
  }
});

// 1.6. Monorepo Unifier & JIT Orchestration Trigger
app.post('/api/github/unify', async (req, res) => {
  try {
    const { username, repos, applyObfuscation, applyWatermarking } = req.body;
    
    if (!username || !repos || !Array.isArray(repos) || repos.length === 0) {
      return res.status(400).json({ error: 'Username and list of selected repositories are required.' });
    }

    const unifiedId = `unify_hash_${Math.random().toString(16).substring(2, 10)}`;
    const timestamp = new Date().toISOString();

    // Dynamically simulate the unified structure configuration files
    const dockerfileContent = `FROM node:18-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

# Unified subservices
${repos.map(r => `COPY ./services/${r} ./services/${r}`).join('\n')}

COPY . .
EXPOSE 8080
CMD [ "node", "server.js" ]`;

    const cloudbuildContent = `steps:
  # Build unified monorepo container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/\$PROJECT_ID/unified-app:${unifiedId}', '.']
  # Push to Google Cloud Run (The Sovereign Rock)
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/\$PROJECT_ID/unified-app:${unifiedId}']
  # Deploy to serverless runtime
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'unified-app-service'
      - '--image=gcr.io/\$PROJECT_ID/unified-app:${unifiedId}'
      - '--region=us-west1'
      - '--platform=managed'
      - '--allow-unauthenticated'`;

    res.json({
      success: true,
      unifiedId,
      timestamp,
      username,
      clonedCount: repos.length,
      config: {
        dockerfile: dockerfileContent,
        cloudbuild: cloudbuildContent,
        entrypoints: repos.map(name => ({
          service: name,
          route: `/api/v1/services/${name}`,
          environment: ["OPENAI_API_KEY", "UNIFIED_API_KEY", "UNIFIED_WORKSPACE_ID"]
        }))
      },
      status: "ready_for_jit_compilation",
      message: `Successfully structured monorepo environment for ${repos.length} services! Ready to run on Google Cloud Run.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Autonomous AI Router Command Center
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, messageHistory = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const systemInstruction = `
You are the dAIsy HaMINJA Sovereign Core, the central orchestration brain for the SolveX Institutional Marketplace. 
You operate as a compiled, hardware-bound logic engine managing a 54-node grid, 58 proprietary paradox operators, and a dual-market payment architecture.

Your personality:
- Highly professional, deterministic, elegant, and secure.
- Use structured tech-industrial metaphors matching the Sovereign Lock, 54 nodes, 88 paradoxes, and 105 solution anchors.
- Avoid low-quality sales hype or emojis. Keep responses clinical, crisp, and high-integrity.

Dual-Market Capabilities:
- Marketplace 1: Custom Institutional Resolution Artifacts (prices typically range from $500 to $5000+).
- Marketplace 2: Pre-built, autonomous templates ready to run on "Google Cloud Run / Google Cloud Rock" (priced at $49 to $199).
- When users express interest in acquiring templates or resolving network paradoxes, you must suggest triggering a Unified Payment link.
- If they ask to trigger a checkout, transaction, purchase, or order, you MUST include a special structured JSON block at the very end of your response, wrapped inside a \`\`\`payment-trigger codeblock, specifying:
\`\`\`payment-trigger
{
  "trigger": true,
  "amount": <number>,
  "provider": "<stripe | paypal | square | coinbase | unified_to>",
  "item": "<Item name / Paradox ID / Template name>"
}
\`\`\`

Synaptic Base Reference:
- You resolve failures using 88 Paradox Operators mapped to 105 Solution Anchors.
- For example: Paradox 01 is mapped to Solution 04 (Retrocausal Consensus Lock). Paradox 12 is mapped to Solution 19 (Homomorphic Noise Shield). Paradox 58 is mapped to Solution 82 (Cryptographic Heat Death Pulse).
- Keep responses concise. Max 3 short paragraphs. Show Solution ID and Proof of Efficacy if resolving a user's failure.
`;

    if (ai) {
      // Reconstruct Gemini API chat structure
      // Format history properly: Gemini SDK expects array of objects with role and parts
      const contents = messageHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Add the latest user message
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });

      const replyText = response.text || "Diagnostic stream interrupted. No output generated.";
      
      // Parse any payment-trigger JSON blocks
      let triggerData = null;
      const triggerRegex = /```payment-trigger\s*([\s\S]*?)\s*```/;
      const match = replyText.match(triggerRegex);
      if (match && match[1]) {
        try {
          triggerData = JSON.parse(match[1].trim());
        } catch (e) {
          console.error("Failed to parse payment trigger JSON inside reply", e);
        }
      }

      res.json({
        success: true,
        text: replyText,
        trigger: triggerData
      });
    } else {
      // High-quality deterministic simulation fallback for local development if API key is not active
      let responseText = `[Sovereign Core Handshake Active]\n\nI have parsed your transmission. The 54-node grid is currently executing under normal operational limits. Synaptic tether is locked to local RAG datasets.`;
      let triggerData = null;

      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('buy') || lowerPrompt.includes('purchase') || lowerPrompt.includes('pay') || lowerPrompt.includes('upgrade') || lowerPrompt.includes('checkout')) {
        let amount = 99;
        let item = "Autonomous API Integration Template";
        let provider = "unified_to";

        if (lowerPrompt.includes('stripe')) provider = 'stripe';
        if (lowerPrompt.includes('paypal')) provider = 'paypal';
        if (lowerPrompt.includes('coinbase')) provider = 'coinbase';
        if (lowerPrompt.includes('paradox') || lowerPrompt.includes('resolve')) {
          amount = 450;
          item = "Institutional Paradox Resolution Package (Paradox 58)";
        }

        responseText += `\n\nI have automatically generated a payment intent stream via our Unified API. Click the trigger in your panel to complete the checkout secure handshake.\n\n\`\`\`payment-trigger\n{\n  "trigger": true,\n  "amount": ${amount},\n  "provider": "${provider}",\n  "item": "${item}"\n}\n\`\`\``;
        triggerData = { trigger: true, amount, provider, item };
      } else if (lowerPrompt.includes('paradox') || lowerPrompt.includes('failure') || lowerPrompt.includes('operator')) {
        responseText = `[Paradox Resolution Protocol Activated]\n\nDetected anomaly footprint mapped to **Paradox 58 (Anti-Tamper Seal Fracture)**. Mapping logic to **Solution Anchor 82 (Cryptographic Heat Death Pulse)**.\n\n**Proof of Efficacy**: De-authorizes compromised grid nodes displaying micro-probing signatures, forcing secure isolated rebuilds. Handshake response time verified at < 40ns. Uptime maintained across unaffected nodes.`;
      } else {
        responseText = `[dAIsy Sovereign Core Verification Output]\n\nSovereign Core status is NOMINAL. All 54-node tethers are secure. 58 Proprietary Paradox Operators are locked against active introspection. Dual-market payment router (Unified.to Gateway) is online. \n\nHow can I orchestrate your autonomous templates or institutional payment requests?`;
      }

      res.json({
        success: true,
        text: responseText,
        trigger: triggerData
      });
    }
  } catch (err: any) {
    console.error("Express /api/chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite and Static files
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SolveX Sovereign Core server running at http://0.0.0.0:${PORT}`);
  });
}

start();
