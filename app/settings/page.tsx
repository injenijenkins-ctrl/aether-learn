'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Key, Loader2, Save, ShieldCheck, XCircle } from 'lucide-react';
import {
  isAIConfigured,
  loadAISettings,
  maskApiKey,
  providerHeaders,
  saveAISettings,
} from '@/lib/ai-settings';
import {
  DEFAULT_AI_PROVIDER,
  PROVIDER_PRESETS,
  type AIProviderConfig,
} from '@/lib/ai-provider-types';

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

const gradientButtonStyle = {
  background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)',
  border: 'none',
  color: '#ffffff',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AIProviderConfig>(DEFAULT_AI_PROVIDER);
  const [saved, setSaved] = useState(false);
  const [preset, setPreset] = useState<string>('custom');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadAISettings();
    setSettings(loaded);
    setSaved(isAIConfigured(loaded));

    const match = PROVIDER_PRESETS.find(
      (p) => p.baseUrl === loaded.baseUrl && p.model === loaded.model
    );
    if (match) setPreset(match.id);
  }, []);

  const handlePreset = (id: string) => {
    setPreset(id);
    const p = PROVIDER_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setSettings((s) => ({
      ...s,
      baseUrl: p.baseUrl,
      model: p.model,
      embeddingModel: p.embeddingModel,
    }));
  };

  const handleSave = () => {
    if (!settings.apiKey.trim()) {
      toast.error('API key is required');
      return;
    }
    if (!settings.baseUrl.trim()) {
      toast.error('Base URL is required');
      return;
    }
    if (!settings.model.trim()) {
      toast.error('Model name is required');
      return;
    }

    saveAISettings({
      ...settings,
      apiKey: settings.apiKey.trim(),
      baseUrl: settings.baseUrl.trim(),
      model: settings.model.trim(),
      embeddingModel:
        settings.embeddingModel?.trim() || DEFAULT_AI_PROVIDER.embeddingModel,
    });
    setSaved(true);
    toast.success('AI provider settings saved');
  };

  const handleTestConnection = async () => {
    if (!settings.apiKey.trim() || !settings.baseUrl.trim() || !settings.model.trim()) {
      toast.error('Fill API key, base URL, and model before testing');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/provider/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...providerHeaders(settings),
        },
        body: JSON.stringify({
          provider: {
            apiKey: settings.apiKey.trim(),
            baseUrl: settings.baseUrl.trim(),
            model: settings.model.trim(),
            embeddingModel:
              settings.embeddingModel?.trim() || DEFAULT_AI_PROVIDER.embeddingModel,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Connection test failed');
      }

      const successMsg = `Connected to ${data.provider.model} at ${data.provider.baseUrl}`;
      setTestResult(successMsg);
      toast.success(successMsg);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection test failed';
      setTestResult(`Failed: ${message}`);
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const configured = isAIConfigured(settings);

  return (
    <AppShell
      title="Settings"
      description="Connect any OpenAI-compatible provider — OpenAI, OpenRouter, Groq, Mistral, Ollama, and more."
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl space-y-6"
      >
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="mb-7 flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(124,106,245,0.12)' }}
            >
              <Key className="h-6 w-6" style={{ color: '#7C6AF5' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>AI Provider</h2>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                Settings are stored in your browser (localStorage) and sent with each
                API request. Use any provider with an OpenAI-compatible REST API.
              </p>
              <div className="mt-3 flex items-center gap-2">
                {configured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-sm" style={{ color: '#34D399' }}>Ready to use</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400" />
                    <span className="text-sm" style={{ color: '#F87171' }}>
                      Complete all fields below
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label style={{ color: '#8B9AB0' }}>Quick preset</Label>
              <Select value={preset} onValueChange={handlePreset}>
                <SelectTrigger className="mt-2 min-h-[44px] w-full" style={inputStyle}>
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent style={{ background: '#141B24', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <SelectItem value="custom">Custom</SelectItem>
                  {PROVIDER_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="apiKey" style={{ color: '#8B9AB0' }}>API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, apiKey: e.target.value }))
                }
                placeholder="sk-..."
                className="mt-2 min-h-[44px] font-mono text-sm"
                style={inputStyle}
                autoComplete="off"
              />
              {saved && settings.apiKey && (
                <p className="mt-1 text-xs" style={{ color: '#4A5568' }}>
                  Saved: {maskApiKey(settings.apiKey)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="baseUrl" style={{ color: '#8B9AB0' }}>Base URL</Label>
              <Input
                id="baseUrl"
                value={settings.baseUrl}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, baseUrl: e.target.value }))
                }
                placeholder="https://api.openai.com/v1"
                className="mt-2 min-h-[44px] font-mono text-sm"
                style={inputStyle}
              />
              <p className="mt-1 text-xs" style={{ color: '#4A5568' }}>
                OpenAI-compatible root, usually ending in <code>/v1</code>
              </p>
            </div>

            <div>
              <Label htmlFor="model" style={{ color: '#8B9AB0' }}>Model name</Label>
              <Input
                id="model"
                value={settings.model}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, model: e.target.value }))
                }
                placeholder="gpt-4o"
                className="mt-2 min-h-[44px] font-mono text-sm"
                style={inputStyle}
              />
              <p className="mt-1 text-xs" style={{ color: '#4A5568' }}>
                Chat/completions model (e.g. gpt-4o, claude-3-5-sonnet via OpenRouter)
              </p>
            </div>

            <div>
              <Label htmlFor="embeddingModel" style={{ color: '#8B9AB0' }}>Embedding model (optional)</Label>
              <Input
                id="embeddingModel"
                value={settings.embeddingModel ?? ''}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    embeddingModel: e.target.value,
                  }))
                }
                placeholder={DEFAULT_AI_PROVIDER.embeddingModel}
                className="mt-2 min-h-[44px] font-mono text-sm"
                style={inputStyle}
              />
              <p className="mt-1 text-xs" style={{ color: '#4A5568' }}>
                Used for RAG ingestion. Default:{' '}
                {DEFAULT_AI_PROVIDER.embeddingModel}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={handleSave}
                className="min-h-[44px] w-full sm:w-auto"
                style={gradientButtonStyle}
              >
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="min-h-[44px] w-full sm:w-auto"
                style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.22)', color: '#F0F4F8' }}
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {testing ? 'Testing...' : 'Test connection'}
              </Button>
            </div>
            {testResult && (
              <p className="text-xs" style={{ color: '#8B9AB0' }}>{testResult}</p>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl p-6"
          style={cardStyle}
        >
          <h3 className="mb-3 font-semibold" style={{ color: '#F0F4F8' }}>Example configurations</h3>
          <ul className="space-y-3 text-sm" style={{ color: '#8B9AB0' }}>
            <li>
              <strong style={{ color: '#F0F4F8' }}>OpenAI:</strong>{' '}
              <code className="text-xs">https://api.openai.com/v1</code> +{' '}
              <code className="text-xs">gpt-4o-mini</code>
            </li>
            <li>
              <strong style={{ color: '#F0F4F8' }}>OpenRouter:</strong>{' '}
              <code className="text-xs">https://openrouter.ai/api/v1</code> + model
              slug
            </li>
            <li>
              <strong style={{ color: '#F0F4F8' }}>Ollama:</strong>{' '}
              <code className="text-xs">http://localhost:11434/v1</code> + local
              model name
            </li>
          </ul>
          <p className="mt-4 text-sm" style={{ color: '#8B9AB0' }}>
            After saving, go to{' '}
            <Link href="/ingestion" className="underline" style={{ color: '#7C6AF5' }}>
              Ingestion
            </Link>{' '}
            to add content, then use Tutor, Lessons, or Quizzes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-2xl p-6 text-sm"
          style={{ background: 'rgba(124,106,245,0.07)', border: '1px solid rgba(124,106,245,0.16)', color: '#8B9AB0' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" style={{ color: '#7C6AF5' }} />
            <span className="font-semibold" style={{ color: '#F0F4F8' }}>Storage and security</span>
          </div>
          <p>
            <strong style={{ color: '#F0F4F8' }}>Security:</strong> Your API key stays
            in localStorage on this device and is sent to your Next.js server with each
            request. Do not share your browser profile on untrusted machines.
          </p>
          <p className="mt-2">
            <strong style={{ color: '#F0F4F8' }}>Note:</strong> Ingested content and
            embeddings are stored in your Supabase database.
          </p>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
