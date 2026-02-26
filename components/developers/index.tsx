'use client';

import { useMemo, useState } from 'react';
import { Key, Clock, Shield, Plus, Search, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiKeyScope } from '@/lib/api-keys';

export interface ApiKey {
  id: string;
  name: string;
  scope: ApiKeyScope;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
}

export interface ApiKeyCardProps {
  apiKey: ApiKey;
  onRevoke?: (apiKey: ApiKey) => void;
  onCopy?: (fullKey: string) => void;
}

export function ApiKeyCard({
  apiKey,
  onRevoke,
  onCopy,
}: ApiKeyCardProps) {
  const isRevoked = !!apiKey.revoked_at;
  const isExpired = apiKey.expires_at ? new Date(apiKey.expires_at) < new Date() : false;

  return (
    <Card className={`transition-all hover:shadow-md ${isRevoked ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isRevoked ? 'bg-gray-100 dark:bg-gray-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
              <Key className={`h-4 w-4 ${isRevoked ? 'text-gray-500' : 'text-amber-600'}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{apiKey.name}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">
                flame_ak_{apiKey.key_prefix}_…
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs">
              {apiKey.scope === 'read' ? 'Read only' : 'Read & Write'}
            </Badge>
            {isRevoked && (
              <Badge variant="destructive" className="text-xs">Revoked</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Created: {new Date(apiKey.created_at).toLocaleString()}</span>
          </div>
          {apiKey.last_used_at && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Last used: {new Date(apiKey.last_used_at).toLocaleString()}</span>
            </div>
          )}
          {apiKey.expires_at && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Expires: {new Date(apiKey.expires_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled
          >
            Reveal
          </Button>
          {onRevoke && !isRevoked && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRevoke(apiKey)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onRevoke: (apiKey: ApiKey) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export function ApiKeyList({
  apiKeys,
  onRevoke,
  onAddNew,
  isLoading = false,
}: ApiKeyListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApiKeys = useMemo(() => {
    if (!searchTerm) return apiKeys;
    return apiKeys.filter(
      (k) =>
        k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.key_prefix.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [apiKeys, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">API Keys ({apiKeys.length})</h2>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search API keys..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {filteredApiKeys.map((apiKey) => (
          <ApiKeyCard
            key={apiKey.id}
            apiKey={apiKey}
            onRevoke={onRevoke}
          />
        ))}
        {filteredApiKeys.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No API keys found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search' : 'Create your first API key to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={onAddNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface NewApiKeyDisplayProps {
  fullKey: string;
  name: string;
  scope: ApiKeyScope;
  onCopy?: () => void;
  onDismiss?: () => void;
}

export function NewApiKeyDisplay({
  fullKey,
  name,
  scope,
  onCopy,
  onDismiss,
}: NewApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-amber-200">
        New API key created
      </h2>
      <p className="text-xs text-amber-100/80">
        This is the only time you will see the full key. Copy it now and store it securely.
      </p>
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
        <code className="flex-1 rounded bg-black/40 px-2 py-1 text-xs break-all border border-amber-500/40">
          {fullKey}
        </code>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          {onDismiss && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
