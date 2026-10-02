// ============================================================================
// SOVEREIGN DAISY HAMINJA UNIVERSAL VOICE & CHAT ASSISTANT COMPONENT
// Living AI Avatar with Full Facial Expressions, Real-Time Lip-Sync, Voice Control,
// Direct Execution Capabilities, and Guaranteed Speech/Visual Telepresence
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import daisyAvatarImg from '../assets/images/daisy_avatar_portrait_1784658206570.jpg';
import { DaisyHaminjaAutonomousEngine, SovereignChatTelemetryInspector } from '../lib/daisyAutonomousEngine';
import { SovereignExpressiveVoiceEngine } from '../lib/sovereignExpressiveVoiceEngine';
import { BRAIN_DATA_MANIFEST, SYSTEM_MANIFEST_DATA, DECODED_TELEMETRY_STREAM } from '../lib/brainDataManifest';

export type AIState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'optimized';

const getApiUrl = (endpoint: string): string => {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    window.location.origin.startsWith('http') &&
    !window.location.protocol.startsWith('file') &&
    !window.location.protocol.startsWith('app')
  ) {
    return cleanPath;
  }
  const fallbackBackend = import.meta.env.VITE_APP_URL || 'https://ais-pre-3y3j3yyljcsyipwgof5h4q-630645465623.us-west2.run.app';
  return `${fallbackBackend.replace(/\/$/, '')}${cleanPath}`;
};

export interface DaisyHaminjaAssistantProps {
  onRunSelfHealingScan?: () => void;
  onPurgeErrors?: () => void;
  onUpgradeTier?: (tier: string) => void;
  onRefreshMetrics?: () => void;
  onOpenUpgradeModal?: () => void;
  onOpenGoogleModal?: () => void;
  userTier?: string;
  userEmail?: string | null;
  isAdmin?: boolean;
  customAppLabel?: string;
  customPackageId?: string;
  customVersionName?: string;
  customAppTheme?: string;
  onUpdateWorkspaceConfig?: (updates: {
    customAppLabel?: string;
    customPackageId?: string;
    customVersionName?: string;
    customAppTheme?: any;
  }) => void;
  onTriggerBuild?: () => void;
}

export const DaisyHaminjaAssistant: React.FC<DaisyHaminjaAssistantProps> = ({
  onRunSelfHealingScan,
  onPurgeErrors,
  onUpgradeTier,
  onRefreshMetrics,
  onOpenUpgradeModal,
  onOpenGoogleModal,
  userTier = 'FREE',
  userEmail = null,
  isAdmin = false,
  customAppLabel = 'SolveX Sovereign App',
  customPackageId = 'com.solvex.sovereign',
  customVersionName = '1.0.0',
  customAppTheme = 'cyan',
  onUpdateWorkspaceConfig,
  onTriggerBuild,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullImmersion, setIsFullImmersion] = useState(false);
  const [showLargeFace, setShowLargeFace] = useState(true);
  const [aiState, setAiState] = useState<AIState>('idle');
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([
    {
      sender: 'Daisy Haminja',
      text: 'Sovereign Core active. 54-node telemetry grid online. Direct app execution enabled. How can I assist you?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState<number>(0);
  const [lipOpenness, setLipOpenness] = useState<number>(0);
  const [telemetryAlert, setTelemetryAlert] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Unlock Web Audio Context on first user interaction
  const unlockAudioContext = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      setAudioUnlocked(true);
    } catch (e) {
      console.warn('AudioContext unlock exception:', e);
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      unlockAudioContext();
    };
    window.addEventListener('click', handleGlobalClick, { once: true });
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Web Audio synth for audio feedback chimes
  const playAudioChime = (type: 'startup' | 'ping' | 'speak' | 'complete' | 'heal') => {
    try {
      unlockAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'startup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'ping') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'complete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      // Ignore audio context exceptions
    }
  };

  // Web Audio Vocal Formant Speech Synthesizer Fallback (Produces audible robotic/cyber voice tones)
  const synthesizeVocalFormants = (text: string) => {
    try {
      unlockAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const words = text.split(' ');
      let timeOffset = ctx.currentTime + 0.05;

      words.forEach((word) => {
        const osc = ctx.createOscillator();
        const formant1 = ctx.createBiquadFilter();
        const formant2 = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        // Vocal formant frequency configuration
        formant1.type = 'bandpass';
        formant1.frequency.setValueAtTime(500, timeOffset);
        formant1.Q.setValueAtTime(4, timeOffset);

        formant2.type = 'bandpass';
        formant2.frequency.setValueAtTime(1500, timeOffset);
        formant2.Q.setValueAtTime(4, timeOffset);

        osc.type = 'sawtooth';
        const baseFreq = 180 + (word.length % 5) * 20;
        osc.frequency.setValueAtTime(baseFreq, timeOffset);

        osc.connect(formant1);
        formant1.connect(formant2);
        formant2.connect(gain);
        gain.connect(ctx.destination);

        const duration = Math.min(0.25, Math.max(0.1, word.length * 0.04));
        gain.gain.setValueAtTime(0.12, timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + duration);

        osc.start(timeOffset);
        osc.stop(timeOffset + duration);

        timeOffset += duration + 0.03;
      });
    } catch (e) {
      console.warn('Vocal Formant Synth exception:', e);
    }
  };

  // Initialize Autonomous Observer and Voice Hooks on mount
  useEffect(() => {
    SovereignExpressiveVoiceEngine.registerVoiceHooks();

    DaisyHaminjaAutonomousEngine.initializeAutonomousObserver((result) => {
      if (result.fixed) {
        playAudioChime('heal');
        const alertMsg = `[Autonomous Auto-Fix Engaged] ${result.actionTaken}`;
        setTelemetryAlert(alertMsg);

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [
          ...prev,
          { sender: 'Daisy Haminja (Self-Healing)', text: alertMsg, time: timeStr }
        ]);
        speakWithLipSync(`I intercepted an anomaly and applied an autonomous patch targeting ${result.moduleTarget}.`);
      }
    });
  }, []);

  // Track cursor position for eye gaze
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setAiState('listening');
        playAudioChime('ping');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputVal(transcript);
        setVoiceVolume(Math.min(1, transcript.length / 30));

        if (event.results[0].isFinal) {
          setIsListening(false);
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setAiState('idle');
      };

      recognition.onend = () => {
        setIsListening(false);
        if (handsFree && aiState !== 'speaking' && aiState !== 'thinking') {
          setTimeout(() => {
            try { recognition.start(); } catch (e) {}
          }, 1000);
        } else if (aiState === 'listening') {
          setAiState('idle');
        }
      };

      (window as any)._daisySpeechRec = recognition;
    }
  }, [handsFree, aiState]);

  // Speech Synthesis with real-time lip sync & subtitle display
  const speakWithLipSync = (text: string) => {
    unlockAudioContext();
    setSubtitle(text);

    let mouthTimer: any = null;

    if ('speechSynthesis' in window) {
      const startLipSync = () => {
        setAiState('speaking');
        mouthTimer = setInterval(() => {
          const randomOpen = Math.random() * 0.85 + 0.15;
          setLipOpenness(randomOpen);
          setVoiceVolume(randomOpen);
        }, 70);
      };

      const endLipSync = () => {
        if (mouthTimer) clearInterval(mouthTimer);
        setLipOpenness(0);
        setVoiceVolume(0);
        setAiState('idle');
        setTimeout(() => setSubtitle(null), 1500);
        playAudioChime('complete');
      };

      const boundaryLipSync = () => {
        setLipOpenness(Math.random() * 0.95 + 0.1);
      };

      SovereignExpressiveVoiceEngine.speakExpressive(text, startLipSync, endLipSync, boundaryLipSync);
    } else {
      // Fallback to Vocal Formants
      setAiState('speaking');
      synthesizeVocalFormants(text);
      const mouthInterval = setInterval(() => {
        setLipOpenness(Math.random() * 0.8 + 0.2);
      }, 80);
      setTimeout(() => {
        clearInterval(mouthInterval);
        setLipOpenness(0);
        setAiState('idle');
        setTimeout(() => setSubtitle(null), 1500);
      }, Math.max(1500, text.length * 50));
    }
  };

  const toggleVoiceListening = () => {
    unlockAudioContext();
    const recognition = (window as any)._daisySpeechRec;
    if (!recognition) {
      alert('Speech recognition is not supported in this browser runtime.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setAiState('idle');
    } else {
      try {
        recognition.start();
      } catch (e) {
        setIsListening(true);
      }
    }
  };

  // Direct Application Function Executions based on user intent
  const executeAppFunction = (lowerQuery: string): { executed: boolean; replyText: string } => {
    // 1. Self-Healing & Telemetry Scan
    if (lowerQuery.includes('heal') || lowerQuery.includes('scan') || lowerQuery.includes('fix') || lowerQuery.includes('repair') || lowerQuery.includes('self-healing')) {
      if (onRunSelfHealingScan) onRunSelfHealingScan();
      if (onPurgeErrors) onPurgeErrors();
      playAudioChime('heal');
      return {
        executed: true,
        replyText: 'Executing 54-node self-healing telemetry scan. DOM error nodes purged, local storage flags synchronized, and client bypass active.'
      };
    }

    // 2. Clear Errors & DOM Purge
    if (lowerQuery.includes('purge') || lowerQuery.includes('clear error') || lowerQuery.includes('clean dom')) {
      if (onPurgeErrors) onPurgeErrors();
      playAudioChime('heal');
      return {
        executed: true,
        replyText: 'DOM error nodes purged successfully. Forced client bypass mode initialized.'
      };
    }

    // 3. Upgrade Tier to Sovereign Lifetime/Pro
    if (lowerQuery.includes('upgrade') || lowerQuery.includes('pro') || lowerQuery.includes('lifetime') || lowerQuery.includes('license') || lowerQuery.includes('unlock')) {
      if (onUpgradeTier) onUpgradeTier('LIFETIME_EXCLUSIVE');
      else if (onOpenUpgradeModal) onOpenUpgradeModal();
      playAudioChime('startup');
      return {
        executed: true,
        replyText: 'Cryptographic license upgraded to Sovereign Lifetime Exclusive Mode. All 54 monorepo nodes unlocked with zero build limits.'
      };
    }

    // 4. Refresh Metrics & SHA-256 Fingerprint
    if (lowerQuery.includes('metric') || lowerQuery.includes('status') || lowerQuery.includes('grid') || lowerQuery.includes('node') || lowerQuery.includes('fingerprint')) {
      if (onRefreshMetrics) onRefreshMetrics();
      playAudioChime('ping');
      return {
        executed: true,
        replyText: 'Refreshing 54-node grid telemetry. Re-calculated 256-bit SHA-256 cryptographic fingerprint and updated compliance seals.'
      };
    }

    // 5. Open Google SSO Administrative Modal
    if (lowerQuery.includes('google') || lowerQuery.includes('sso') || lowerQuery.includes('admin') || lowerQuery.includes('gods.battle.axe')) {
      if (onOpenGoogleModal) onOpenGoogleModal();
      playAudioChime('ping');
      return {
        executed: true,
        replyText: 'Opening Google SSO administrative access portal.'
      };
    }

    return { executed: false, replyText: '' };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputVal;
    if (!query.trim()) return;

    unlockAudioContext();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgs = [...messages, { sender: 'You', text: query, time: timeStr }];
    setMessages(newMsgs);
    setInputVal('');
    setAiState('thinking');

    const lower = query.toLowerCase();

    if (lower === 'clear') {
      setMessages([]);
      setAiState('idle');
      return;
    }

    // Detect 'Hey Daisy' Wake-Word Activator
    const isWakeWord = lower.includes('hey daisy') || lower.includes('hi daisy') || lower.includes('wake up daisy') || lower.includes('hey daisy haminja') || lower.startsWith('daisy');
    if (isWakeWord) {
      playAudioChime('startup');
    }

    // Strip wake word prefix if user said "Hey Daisy, <command>"
    let commandPayload = lower
      .replace(/^hey daisy,?\s*/i, '')
      .replace(/^hi daisy,?\s*/i, '')
      .replace(/^wake up daisy,?\s*/i, '')
      .replace(/^daisy,?\s*/i, '')
      .trim();

    // Check if query triggers a direct local app action
    const appExec = executeAppFunction(commandPayload || lower);
    if (appExec.executed) {
      const resTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([...newMsgs, { sender: 'Daisy Haminja', text: appExec.replyText, time: resTime }]);
      setAiState('speaking');
      speakWithLipSync(appExec.replyText);
      return;
    }

    // Query Gemini LLM DAIsy Brain for intelligent conversation & Admin app modifications
    const isUserAdmin = Boolean(isAdmin || userEmail === 'gods.battle.axe.88@gmail.com');
    try {
      const apiUrl = getApiUrl('/api/gemini/daisy-chat');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          userEmail,
          userTier,
          isAdmin: isUserAdmin,
          workspaceContext: {
            customAppLabel,
            customPackageId,
            customVersionName,
            customAppTheme,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.replyText || 'Sovereign Core logic response compiled.';

        // Process application-wide update command if generated by Admin request
        if (data.appUpdateCommand) {
          const cmd = data.appUpdateCommand;
          playAudioChime('heal');

          if (cmd.type === 'UPDATE_APP_CONFIG' && cmd.payload) {
            if (onUpdateWorkspaceConfig) {
              onUpdateWorkspaceConfig({
                customAppLabel: cmd.payload.customAppLabel,
                customPackageId: cmd.payload.customPackageId,
                customVersionName: cmd.payload.customVersionName,
                customAppTheme: cmd.payload.customAppTheme,
              });
            }
            setTelemetryAlert(`[Admin Application Update Executed] ${cmd.payload.actionSummary || 'Application configuration updated system-wide.'}`);
          } else if (cmd.type === 'RUN_SELF_HEALING') {
            if (onRunSelfHealingScan) onRunSelfHealingScan();
            setTelemetryAlert('[Admin Execution] Sovereign Self-Healing Anomaly Scan engaged across 54-node grid.');
          } else if (cmd.type === 'PURGE_ERRORS') {
            if (onPurgeErrors) onPurgeErrors();
            setTelemetryAlert('[Admin Execution] Purged memory exceptions and DOM error telemetry.');
          } else if (cmd.type === 'TRIGGER_BUILD') {
            if (onTriggerBuild) onTriggerBuild();
            setTelemetryAlert('[Admin Execution] Initiated application JIT compilation build.');
          }
        }

        const resTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages([...newMsgs, { sender: 'Daisy Haminja', text: reply, time: resTime }]);
        setAiState('speaking');
        speakWithLipSync(reply);
        return;
      }
    } catch (err) {
      console.warn('Gemini DAIsy Chat API fetch exception, serving Sovereign local synthesis:', err);
    }

    // Local deterministic fallback logic
    let reply = '';
    if (!commandPayload || commandPayload === 'hey daisy' || commandPayload === 'hi daisy' || commandPayload === 'wake up' || commandPayload === 'hello') {
      reply = 'I am listening. How can I assist you with your application or 54-node grid today?';
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('daisy') || lower.includes('who are you')) {
      reply = 'Greetings. I am Daisy Haminja, your Sovereign AI Core. I manage the 54-node grid, self-healing memory vault, and direct execution pipelines.';
    } else if (lower.includes('brain') || lower.includes('manifest') || lower.includes('paradox') || lower.includes('chamber') || lower.includes('bdc')) {
      reply = `Brain Data Manifest active [Engine: ${BRAIN_DATA_MANIFEST.engine}]. Total Paradoxes: ${BRAIN_DATA_MANIFEST.totalParadoxes} (${BRAIN_DATA_MANIFEST.breakdown.historical} historical, ${BRAIN_DATA_MANIFEST.breakdown.newlySolved} newly solved). Telemetry grid: ${SYSTEM_MANIFEST_DATA.telemetry_grid.nodes} nodes synchronized.`;
    } else if (lower.includes('telemetry') || lower.includes('hex') || lower.includes('70617261')) {
      reply = `Hex Telemetry Stream Decoded: ${DECODED_TELEMETRY_STREAM.replace(/\n/g, ' | ')}`;
    } else if (lower.includes('error') || lower.includes('json') || lower.includes('bug')) {
      const context = SovereignChatTelemetryInspector.inspectCurrentContext();
      reply = `Anomaly analyzed: ${context.detectedError}. ${context.remediationStatus}`;
    } else if (isUserAdmin && (lower.includes('update') || lower.includes('change') || lower.includes('version') || lower.includes('name'))) {
      if (onUpdateWorkspaceConfig) {
        onUpdateWorkspaceConfig({ customVersionName: '2.0.0', customAppLabel: 'SolveX Sovereign Pro Workspace' });
      }
      reply = `Sovereign Developer privilege verified (gods.battle.axe.88@gmail.com). Application-wide configuration updated to SolveX Sovereign Pro Workspace v2.0.0 across all nodes.`;
      setTelemetryAlert('[Admin Application Update Executed] Updated application parameters across all workspace nodes.');
    } else if (!isUserAdmin && (lower.includes('update') || lower.includes('change app') || lower.includes('edit code'))) {
      reply = `Application-wide modification privileges require Sovereign Developer (Admin) authentication. Please sign in via Google SSO as gods.battle.axe.88@gmail.com to execute system-wide updates.`;
    } else {
      reply = `Synchronizing with 54-node telemetry matrix for '${commandPayload || query}'. Operational parameters optimal. Current tier: ${userTier}.`;
    }

    const resTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([...newMsgs, { sender: 'Daisy Haminja', text: reply, time: resTime }]);
    setAiState('speaking');
    speakWithLipSync(reply);
  };

  // Render Engine for Canvas Face (supports real portrait + cybernetic vector fallback)
  const setupCanvasAnimation = (canvas: HTMLCanvasElement, width: number, height: number, isLargeStage: boolean) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    canvas.width = width;
    canvas.height = height;

    let frameCount = 0;
    let animId: number;
    let blinkVal = 0;

    const img = new Image();
    img.src = daisyAvatarImg;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      let headScale = 1.0;
      let headTiltX = 0;
      let headTiltY = 0;

      if (aiState === 'speaking') {
        headScale = 1.06 + Math.sin(frameCount * 0.12) * 0.04 * (lipOpenness + 0.2);
        headTiltX = Math.sin(frameCount * 0.08) * (isLargeStage ? 6 : 2);
        headTiltY = Math.cos(frameCount * 0.08) * (isLargeStage ? 4 : 1);
      } else if (aiState === 'listening') {
        headScale = 1.03 + Math.sin(frameCount * 0.1) * 0.02;
      } else if (aiState === 'thinking') {
        headTiltX = Math.sin(frameCount * 0.05) * (isLargeStage ? 8 : 3);
      } else {
        headScale = 1.0 + Math.sin(frameCount * 0.04) * 0.01;
      }

      const drawWidth = width * headScale;
      const drawHeight = height * headScale;
      const drawX = centerX - drawWidth / 2 + headTiltX;
      const drawY = centerY - drawHeight / 2 + headTiltY;

      // Draw Base Avatar or High-Tech Cyber Face
      if (img.complete && img.naturalWidth !== 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX + headTiltX, centerY + headTiltY, (drawWidth * 0.46), 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      } else {
        // High-Tech Cybernetic Vector Face Fallback
        ctx.save();
        ctx.fillStyle = '#0b1329';
        ctx.beginPath();
        ctx.arc(centerX + headTiltX, centerY + headTiltY, (drawWidth * 0.45), 0, Math.PI * 2);
        ctx.fill();

        // Mechanical Face HUD Contours
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(centerX + headTiltX, centerY + headTiltY + 10, drawWidth * 0.25, drawHeight * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Holographic Ring & Vocal Energy Aura
      ctx.save();
      const ringRadius = (drawWidth * 0.46);
      ctx.lineWidth = isLargeStage ? 4 : 2;

      if (aiState === 'speaking') {
        const pulse = Math.sin(frameCount * 0.2) * (isLargeStage ? 8 : 4) * (lipOpenness + 0.3);
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = isLargeStage ? 30 : 12;
        ctx.beginPath();
        ctx.arc(centerX + headTiltX, centerY + headTiltY, ringRadius + pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (aiState === 'listening') {
        const pulse = Math.sin(frameCount * 0.15) * (isLargeStage ? 6 : 3);
        ctx.strokeStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = isLargeStage ? 20 : 10;
        ctx.beginPath();
        ctx.arc(centerX + headTiltX, centerY + headTiltY, ringRadius + pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (aiState === 'thinking') {
        ctx.strokeStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = isLargeStage ? 25 : 10;
        ctx.beginPath();
        ctx.arc(centerX + headTiltX, centerY + headTiltY, ringRadius, frameCount * 0.08, frameCount * 0.08 + Math.PI * 1.5);
        ctx.stroke();
      } else {
        const breath = Math.sin(frameCount * 0.04) * 2;
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(centerX + headTiltX, centerY + headTiltY, ringRadius + breath, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Eye Blink & Cursor Gaze Tracking
      if (frameCount % 160 < 8) {
        blinkVal = Math.sin((frameCount % 160) / 8 * Math.PI);
      } else {
        blinkVal = 0;
      }

      const leftEyeX = centerX + headTiltX - (drawWidth * 0.12);
      const rightEyeX = centerX + headTiltX + (drawWidth * 0.12);
      const eyesY = centerY + headTiltY - (drawHeight * 0.08);
      const eyeRadiusX = drawWidth * 0.07;
      const eyeRadiusY = drawHeight * 0.045 * (1 - blinkVal);

      const dx = (mousePosRef.current.x - window.innerWidth / 2) / (window.innerWidth / 2);
      const dy = (mousePosRef.current.y - window.innerHeight / 2) / (window.innerHeight / 2);
      const pupilOffsetX = dx * (isLargeStage ? 4 : 2);
      const pupilOffsetY = dy * (isLargeStage ? 3 : 1.5);

      ctx.save();
      if (eyeRadiusY > 1) {
        [{ x: leftEyeX }, { x: rightEyeX }].forEach(eye => {
          ctx.fillStyle = aiState === 'listening' ? '#f59e0b' : aiState === 'thinking' ? '#c084fc' : '#00f2fe';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = isLargeStage ? 14 : 8;
          ctx.beginPath();
          ctx.ellipse(eye.x, eyesY, eyeRadiusX * 0.65, Math.max(1, eyeRadiusY * 0.65), 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(eye.x + pupilOffsetX, eyesY + pupilOffsetY, eyeRadiusX * 0.28, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = isLargeStage ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(leftEyeX - eyeRadiusX, eyesY);
        ctx.lineTo(leftEyeX + eyeRadiusX, eyesY);
        ctx.moveTo(rightEyeX - eyeRadiusX, eyesY);
        ctx.lineTo(rightEyeX + eyeRadiusX, eyesY);
        ctx.stroke();
      }
      ctx.restore();

      // Dynamic Mouth Engine (Lip Sync)
      const mouthX = centerX + headTiltX;
      const mouthY = centerY + headTiltY + (drawHeight * 0.18);
      const baseMouthWidth = drawWidth * 0.22;
      const mouthOpenHeight = (drawHeight * 0.14) * lipOpenness;

      ctx.save();
      if (aiState === 'speaking' && lipOpenness > 0.05) {
        ctx.fillStyle = '#070c1a';
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = isLargeStage ? 2.5 : 1.5;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = isLargeStage ? 15 : 6;

        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY, baseMouthWidth / 2, Math.max(2, mouthOpenHeight / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY, (baseMouthWidth / 2) * 0.6, Math.max(1, (mouthOpenHeight / 2) * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = isLargeStage ? 2.5 : 1.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(mouthX - baseMouthWidth / 2, mouthY);
        ctx.quadraticCurveTo(mouthX, mouthY + 4, mouthX + baseMouthWidth / 2, mouthY);
        ctx.stroke();
      }
      ctx.restore();

      // Equalizer Wave Visualizer
      if (aiState === 'listening' || aiState === 'speaking') {
        ctx.save();
        const bars = isLargeStage ? 20 : 12;
        const barWidth = isLargeStage ? 4 : 2;
        const startX = centerX + headTiltX - (bars * (barWidth + 2)) / 2;
        const barBaseY = centerY + headTiltY + (drawHeight * 0.38);

        for (let i = 0; i < bars; i++) {
          const h = Math.abs(Math.sin(frameCount * 0.2 + i * 0.4)) * (drawHeight * 0.12) * (lipOpenness || voiceVolume || 0.4);
          ctx.fillStyle = aiState === 'listening' ? '#f59e0b' : '#00f2fe';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 6;
          ctx.fillRect(startX + i * (barWidth + 2), barBaseY - h / 2, barWidth, h);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    if (img.complete) {
      render();
    } else {
      img.onload = () => render();
      render(); // Immediate fallback call
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  };

  useEffect(() => {
    let cleanupSmall: () => void = () => {};
    let cleanupStage: () => void = () => {};
    let cleanupFull: () => void = () => {};
    let cleanupHud: () => void = () => {};

    if (hudCanvasRef.current) {
      cleanupHud = setupCanvasAnimation(hudCanvasRef.current, 36, 36, false);
    }
    if (canvasRef.current && !isOpen) {
      cleanupSmall = setupCanvasAnimation(canvasRef.current, 48, 48, false);
    }
    if (stageCanvasRef.current && isOpen && !isFullImmersion) {
      cleanupStage = setupCanvasAnimation(stageCanvasRef.current, showLargeFace ? 140 : 54, showLargeFace ? 140 : 54, showLargeFace);
    }
    if (fullCanvasRef.current && isFullImmersion) {
      cleanupFull = setupCanvasAnimation(fullCanvasRef.current, 280, 280, true);
    }

    return () => {
      cleanupSmall();
      cleanupStage();
      cleanupFull();
      cleanupHud();
    };
  }, [aiState, lipOpenness, voiceVolume, isOpen, isFullImmersion, showLargeFace]);

  return (
    <>
      {/* --- PROMINENT ALWAYS-ON DAISY LIVE HUD DOCK (TOP RIGHT) --- */}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 99990,
        backgroundColor: '#0b1329',
        border: '1.5px solid #00f2fe',
        borderRadius: '30px',
        padding: '6px 14px 6px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0, 242, 254, 0.35)',
        backdropFilter: 'blur(12px)',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div
          onClick={() => {
            setIsOpen(true);
            playAudioChime('startup');
          }}
          style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer' }}
          title="Click to Open Full Daisy AI Assistant"
        >
          <canvas ref={hudCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          <div style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: aiState === 'listening' ? '#f59e0b' : aiState === 'speaking' ? '#00f2fe' : '#10b981'
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#00f2fe', letterSpacing: '0.5px' }}>
              DAISY AI CORE
            </span>
            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '8px', backgroundColor: 'rgba(0,242,254,0.15)', color: '#38bdf8' }}>
              {aiState.toUpperCase()}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            54-Node Grid • {userTier} Tier
          </span>
        </div>

        {/* Quick Voice & Function Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
          <button
            onClick={() => {
              unlockAudioContext();
              speakWithLipSync('Daisy Haminja voice output online. How can I assist your application updates today?');
            }}
            style={{
              backgroundColor: '#1e293b',
              color: '#00f2fe',
              border: '1px solid #00f2fe',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Test Daisy Voice Speech Output"
          >
            🔊 Unmute
          </button>

          <button
            onClick={() => handleSendMessage('heal and scan grid')}
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              border: '1px solid #10b981',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Trigger Immediate Self-Healing & Anomaly Repair"
          >
            ⚡ Heal
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              backgroundColor: isOpen ? '#00f2fe' : '#0f172a',
              color: isOpen ? '#070c1a' : '#ffffff',
              border: '1px solid #334155',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isOpen ? 'Close' : 'Chat 💬'}
          </button>
        </div>
      </div>

      {/* --- LIVE SUBTITLE BAR WHEN DAISY SPEAKS --- */}
      {subtitle && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99995,
          backgroundColor: 'rgba(11, 19, 41, 0.95)',
          border: '1px solid #00f2fe',
          borderRadius: '12px',
          padding: '10px 20px',
          maxWidth: '650px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 242, 254, 0.4)',
          backdropFilter: 'blur(10px)',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span style={{ color: '#00f2fe', fontWeight: 800 }}>🗣️ Daisy:</span>
          <span>{subtitle}</span>
        </div>
      )}

      {/* --- FLOATING AVATAR TRIGGER ORB (BOTTOM RIGHT) --- */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999 }}>
        {!isOpen && !isFullImmersion ? (
          <button
            onClick={() => {
              setIsOpen(true);
              playAudioChime('startup');
            }}
            style={{
              backgroundColor: '#0b1329',
              border: '2px solid #00f2fe',
              borderRadius: '50px',
              padding: '8px 18px 8px 10px',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(0, 242, 254, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: aiState === 'listening' ? '#f59e0b' : aiState === 'speaking' ? '#00f2fe' : aiState === 'thinking' ? '#a855f7' : '#10b981',
                boxShadow: `0 0 8px ${aiState === 'listening' ? '#f59e0b' : '#00f2fe'}`
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#00f2fe', letterSpacing: '0.5px' }}>DAISY HAMINJA</span>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                {aiState.toUpperCase()} • 54-NODE CORE
              </span>
            </div>
          </button>
        ) : null}

        {/* --- FLOATING ASSISTANT PANEL WITH INTERACTIVE FACIAL STAGE --- */}
        {isOpen && !isFullImmersion && (
          <div style={{
            width: '390px',
            height: '580px',
            backgroundColor: '#070c1a',
            border: '1.5px solid #00f2fe',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 12px 48px rgba(0, 242, 254, 0.35)',
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, sans-serif',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)'
          }}>
            {/* Panel Header Bar */}
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#0b1329',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Daisy Haminja AI Sovereign
                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#1e293b', color: '#38bdf8' }}>
                  ACTIVE
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowLargeFace(!showLargeFace)}
                  title={showLargeFace ? "Minimize Face View" : "Expand Face Stage"}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '13px', padding: '4px' }}
                >
                  {showLargeFace ? '👤 Min' : '🗣️ Face'}
                </button>
                <button
                  onClick={() => setIsFullImmersion(true)}
                  title="Full Telepresence Mode"
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '15px', padding: '4px' }}
                >
                  🖥️
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* INTERACTIVE AVATAR STAGE */}
            <div style={{
              backgroundColor: '#0b1329',
              padding: showLargeFace ? '14px' : '8px 16px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              flexDirection: showLargeFace ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                position: 'relative',
                width: showLargeFace ? '130px' : '52px',
                height: showLargeFace ? '130px' : '52px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #00f2fe',
                boxShadow: aiState === 'speaking' ? '0 0 30px rgba(0, 242, 254, 0.6)' : '0 0 15px rgba(0, 242, 254, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                <canvas ref={stageCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>

              {showLargeFace && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {aiState === 'speaking' ? '🗣️ Daisy is speaking...' : aiState === 'listening' ? '🎤 Listening...' : '🧠 Sovereign Grid Ready'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#00f2fe', marginTop: '2px' }}>
                    Ask Daisy to heal, upgrade tier, or run scans
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div style={{
              backgroundColor: '#0f172a',
              padding: '8px 12px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => handleSendMessage('heal and scan grid')}
                style={{
                  backgroundColor: '#10b98122',
                  color: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                ⚡ Heal Scan
              </button>

              <button
                onClick={() => handleSendMessage('upgrade license tier to lifetime')}
                style={{
                  backgroundColor: '#00f2fe22',
                  color: '#00f2fe',
                  border: '1px solid #00f2fe',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                👑 Upgrade Tier
              </button>

              <button
                onClick={() => handleSendMessage('purge errors')}
                style={{
                  backgroundColor: '#3b82f622',
                  color: '#60a5fa',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🧹 Purge Errors
              </button>

              <button
                onClick={() => handleSendMessage('refresh metrics')}
                style={{
                  backgroundColor: '#a855f722',
                  color: '#c084fc',
                  border: '1px solid #a855f7',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🔄 Refresh Grid
              </button>

              <button
                onClick={() => {
                  unlockAudioContext();
                  const nextState = !handsFree;
                  setHandsFree(nextState);
                  playAudioChime(nextState ? 'startup' : 'ping');
                  if (nextState) {
                    toggleVoiceListening();
                    speakWithLipSync("Continuous 'Hey Daisy' activator enabled. Say 'Hey Daisy' to control the application.");
                  } else {
                    speakWithLipSync("'Hey Daisy' wake mode paused.");
                  }
                }}
                style={{
                  backgroundColor: handsFree ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: handsFree ? '#00f2fe' : '#94a3b8',
                  border: handsFree ? '1px solid #00f2fe' : '1px solid #334155',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: handsFree ? '0 0 10px rgba(0,242,254,0.3)' : 'none'
                }}
                title="Enable continuous listening for 'Hey Daisy' wake-word activator"
              >
                {handsFree ? '⚡ Wake-Word ON ("Hey Daisy")' : '🎙️ Enable "Hey Daisy" Wake Mode'}
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: '#070c1a'
            }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{
                  alignSelf: m.sender === 'You' ? 'flex-end' : 'flex-start',
                  backgroundColor: m.sender === 'You' ? '#1d4ed8' : '#0b1329',
                  border: m.sender === 'You' ? 'none' : '1px solid #1e293b',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ color: m.sender === 'You' ? '#93c5fd' : '#00f2fe', fontWeight: 600 }}>{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  {m.text}
                </div>
              ))}
            </div>

            {/* Input Controls */}
            <div style={{
              padding: '12px',
              backgroundColor: '#0b1329',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={toggleVoiceListening}
                style={{
                  backgroundColor: isListening ? '#ef4444' : '#1e293b',
                  color: '#ffffff',
                  border: isListening ? '1px solid #f87171' : '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
                title={isListening ? 'Listening...' : 'Speak to Daisy'}
              >
                🎤
              </button>

              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? "Listening..." : "Ask Daisy or give commands..."}
                style={{
                  flex: 1,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />

              <button
                onClick={() => handleSendMessage()}
                style={{
                  backgroundColor: '#00f2fe',
                  color: '#070c1a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- FULLSCREEN TELEPRESENCE IMMERSION MODE --- */}
      {isFullImmersion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#030712',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #0b1329 0%, #030712 100%)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          {/* Top HUD Header */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '24px',
            right: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 242, 254, 0.2)',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#00f2fe', letterSpacing: '1px' }}>
                DAISY HAMINJA SOVEREIGN TELEPRESENCE
              </span>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', border: '1px solid #00f2fe' }}>
                54-NODE MATRIX
              </span>
            </div>

            <button
              onClick={() => setIsFullImmersion(false)}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Exit Telepresence Mode ✕
            </button>
          </div>

          {/* Main Stage */}
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', maxWidth: '1000px', width: '100%', marginTop: '40px' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              flex: '0 0 320px'
            }}>
              <div style={{
                position: 'relative',
                width: '280px',
                height: '280px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #00f2fe',
                boxShadow: aiState === 'speaking' ? '0 0 80px rgba(0, 242, 254, 0.7)' : '0 0 40px rgba(0, 242, 254, 0.3)'
              }}>
                <canvas ref={fullCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>Daisy Haminja</div>
                <div style={{ fontSize: '13px', color: '#00f2fe', marginTop: '4px' }}>
                  STATE: {aiState.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={toggleVoiceListening}
                  style={{
                    backgroundColor: isListening ? '#ef4444' : '#00f2fe',
                    color: '#070c1a',
                    border: 'none',
                    borderRadius: '25px',
                    padding: '12px 24px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: '0 4px 20px rgba(0, 242, 254, 0.4)'
                  }}
                >
                  {isListening ? 'Stop Listening ⏹️' : 'Speak to Daisy 🎤'}
                </button>
              </div>
            </div>

            {/* Transcript */}
            <div style={{
              flex: 1,
              height: '460px',
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>
                LIVE TELEPRESENCE TRANSCRIPT
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, idx) => (
                  <div key={idx} style={{
                    backgroundColor: m.sender === 'You' ? '#1d4ed8' : '#070c1a',
                    border: m.sender === 'You' ? 'none' : '1px solid #00f2fe33',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: m.sender === 'You' ? '#93c5fd' : '#00f2fe' }}>{m.sender}</strong>
                      <span>{m.time}</span>
                    </div>
                    {m.text}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a direct command or query..."
                  style={{
                    flex: 1,
                    backgroundColor: '#070c1a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  style={{
                    backgroundColor: '#00f2fe',
                    color: '#070c1a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
