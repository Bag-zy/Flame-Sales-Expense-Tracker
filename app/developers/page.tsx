'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

import type { ApiKeyScope } from '@/lib/api-keys';

interface ApiKey {
  id: string;
  name: string;
  scope: ApiKeyScope;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
}

interface CreatedKeyState {
  fullKey: string;
  name: string;
  scope: ApiKeyScope;
}

function DevelopersPageContent() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('read');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');
  const [creating, setCreating] = useState(false);

  const [createdKey, setCreatedKey] = useState<CreatedKeyState | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/api-keys');
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setApiKeys(data.apiKeys || []);
      } else {
        toast.error(data.message || 'Failed to load API keys');
      }
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setCreating(true);
    try {
      const body: any = { name: name.trim(), scope };
      if (expiresAtLocal) {
        const iso = new Date(expiresAtLocal).toISOString();
        body.expiresAt = iso;
      }

      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setCreatedKey({ fullKey: data.fullKey, name: name.trim(), scope });
        setName('');
        setExpiresAtLocal('');
        await loadKeys();
        toast.success('API key created');
      } else {
        toast.error(data.message || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/v1/api-keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.success('API key revoked');
        await loadKeys();
      } else {
        toast.error(data.message || 'Failed to revoke API key');
      }
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Developers / API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage API keys for programmatic access. Treat these keys like passwords.
          </p>
        </div>

        {createdKey && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-amber-200">
              New API key created
            </h2>
            <p className="text-xs text-amber-100/80">
              This is the only time you will see the full key. Copy it now and store it securely.
            </p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
              <code className="flex-1 rounded bg-black/40 px-2 py-1 text-xs break-all border border-amber-500/40">
                {createdKey.fullKey}
              </code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2 md:mt-0"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createdKey.fullKey);
                    toast.success('API key copied to clipboard');
                  } catch {
                    toast.error('Failed to copy API key');
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Create new API key</h2>
          <form
            onSubmit={handleCreate}
            className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-3"
          >
            <div className="md:col-span-1 space-y-1">
              <label className="text-sm font-medium">Name</label>
              <p className="text-xs text-muted-foreground">
                Used to identify this key (e.g. &quot;Staging backend&quot;, &quot;CLI&quot;).
              </p>
            </div>
            <div className="md:col-span-2 space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My CLI key"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Scope</label>
                  <Select value={scope} onValueChange={(v) => setScope(v as ApiKeyScope)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read only</SelectItem>
                      <SelectItem value="read_write">Read &amp; write</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Read-only keys can only perform GET/HEAD/OPTIONS requests.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Expires at (optional)</label>
                  <Input
                    type="datetime-local"
                    value={expiresAtLocal}
                    onChange={(e) => setExpiresAtLocal(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for a key with no automatic expiry.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create API key'}
                </Button>
              </div>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Existing API keys</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading API keys…</div>
          ) : apiKeys.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No API keys found. Create your first key above.
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => {
                const isRevoked = !!key.revoked_at;
                return (
                  <div
                    key={key.id}
                    className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {key.name}
                        </h3>
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {key.scope === 'read' ? 'Read only' : 'Read & write'}
                        </span>
                        {isRevoked && (
                          <span className="inline-flex items-center rounded-full border border-destructive/40 px-2 py-0.5 text-xs text-destructive">
                            Revoked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Key prefix: <span className="font-mono">flame_ak_{key.key_prefix}_…</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(key.created_at).toLocaleString()}
                        {key.last_used_at && (
                          <>
                            {' '}
                            • Last used: {new Date(key.last_used_at).toLocaleString()}
                          </>
                        )}
                        {key.expires_at && (
                          <>
                            {' '}
                            • Expires: {new Date(key.expires_at).toLocaleString()}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 md:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                      >
                        Reveal key
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isRevoked}
                        onClick={() => handleRevoke(key.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}

export default function DevelopersPage() {
  return <DevelopersPageContent />;
}
