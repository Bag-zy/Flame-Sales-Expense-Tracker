CREATE TABLE IF NOT EXISTS public.assistant_chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES public.organizations(id) ON DELETE SET NULL,
  title TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistant_chat_sessions_user_id ON public.assistant_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chat_sessions_org_id ON public.assistant_chat_sessions(organization_id);

CREATE TABLE IF NOT EXISTS public.assistant_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.assistant_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_assistant_chat_messages_session_id ON public.assistant_chat_messages(session_id);
