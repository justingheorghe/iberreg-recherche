CREATE TABLE IF NOT EXISTS research_cases (
  id UUID PRIMARY KEY,
  address TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  owner_status TEXT NOT NULL,
  owner_name TEXT,
  owner_confidence NUMERIC(4, 3),
  result JSONB NOT NULL,
  audit_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS research_cases_created_at_idx ON research_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS research_cases_status_idx ON research_cases(status);

CREATE TABLE IF NOT EXISTS source_audit_events (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES research_cases(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  traffic_light TEXT NOT NULL CHECK (traffic_light IN ('green', 'yellow', 'red')),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
