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
import { CheckCircle2, Key, Save, XCircle } from 'lucide-react';
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
        className="max-w-2xl space-y-6"
      >
        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-start gap-4">
            <Key className="mt-1 h-6 w-6 shrink-0 text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold">AI Provider</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Settings are stored in your browser (localStorage) and sent with each
                API request. Use any provider with an OpenAI-compatible REST API.
              </p>
              <div className="mt-3 flex items-center gap-2">
                {configured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-sm text-green-400">Ready to use</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400" />
                    <span className="text-sm text-red-400">
                      Complete all fields below
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label>Quick preset</Label>
              <Select value={preset} onValueChange={handlePreset}>
                <SelectTrigger className="mt-2 border-white/10 bg-background/50">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, apiKey: e.target.value }))
                }
                placeholder="sk-..."
                className="mt-2 border-white/10 bg-background/50 font-mono text-sm"
                autoComplete="off"
              />
              {saved && settings.apiKey && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved: {maskApiKey(settings.apiKey)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={settings.baseUrl}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, baseUrl: e.target.value }))
                }
                placeholder="https://api.openai.com/v1"
                className="mt-2 border-white/10 bg-background/50 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                OpenAI-compatible root, usually ending in <code>/v1</code>
              </p>
            </div>

            <div>
              <Label htmlFor="model">Model name</Label>
              <Input
                id="model"
                value={settings.model}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, model: e.target.value }))
                }
                placeholder="gpt-4o"
                className="mt-2 border-white/10 bg-background/50 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Chat/completions model (e.g. gpt-4o, claude-3-5-sonnet via OpenRouter)
              </p>
            </div>

            <div>
              <Label htmlFor="embeddingModel">Embedding model (optional)</Label>
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
                className="mt-2 border-white/10 bg-background/50 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used for RAG ingestion. Default:{' '}
                {DEFAULT_AI_PROVIDER.embeddingModel}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={handleSave}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full sm:w-auto"
              >
                {testing ? 'Testing...' : 'Test connection'}
              </Button>
            </div>
            {testResult && (
              <p className="text-xs text-muted-foreground">{testResult}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h3 className="mb-3 font-semibold">Example configurations</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">OpenAI:</strong>{' '}
              <code className="text-xs">https://api.openai.com/v1</code> +{' '}
              <code className="text-xs">gpt-4o-mini</code>
            </li>
            <li>
              <strong className="text-foreground">OpenRouter:</strong>{' '}
              <code className="text-xs">https://openrouter.ai/api/v1</code> + model
              slug
            </li>
            <li>
              <strong className="text-foreground">Ollama:</strong>{' '}
              <code className="text-xs">http://localhost:11434/v1</code> + local
              model name
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            After saving, go to{' '}
            <Link href="/ingestion" className="text-indigo-400 underline">
              Ingestion
            </Link>{' '}
            to add content, then use Tutor, Lessons, or Quizzes.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.06] p-6 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Security:</strong> Your API key stays
            in localStorage on this device and is sent to your Next.js server with each
            request. Do not share your browser profile on untrusted machines.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Note:</strong> Ingested content and
            embeddings are stored in your Supabase database.
          </p>
        </div>
      </motion.div>
    </AppShell>
  );
}
