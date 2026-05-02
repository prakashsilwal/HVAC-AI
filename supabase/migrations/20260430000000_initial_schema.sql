-- ============================================================
-- HVAC AI Receptionist — Initial Schema
-- Tables: businesses, user_profiles, subscriptions, calls,
--         transcripts, bookings, email_sequences, notifications
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLE 1: businesses
-- One row per HVAC company using the platform.
-- owner_user_id → auth.users; RLS resolves via user_profiles.
-- ============================================================
CREATE TABLE businesses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone_number     TEXT,                      -- their forwarding / inbound number
  retell_agent_id  TEXT,                      -- set after Retell agent is created
  retell_phone_id  TEXT,                      -- Retell-managed number ID
  timezone         TEXT NOT NULL DEFAULT 'America/Chicago',
  calendly_url     TEXT,
  gcal_token       JSONB,                     -- encrypted Google OAuth tokens
  business_hours   JSONB NOT NULL DEFAULT '{
    "mon": {"open": "08:00", "close": "18:00", "enabled": true},
    "tue": {"open": "08:00", "close": "18:00", "enabled": true},
    "wed": {"open": "08:00", "close": "18:00", "enabled": true},
    "thu": {"open": "08:00", "close": "18:00", "enabled": true},
    "fri": {"open": "08:00", "close": "18:00", "enabled": true},
    "sat": {"open": "09:00", "close": "14:00", "enabled": false},
    "sun": {"open": "09:00", "close": "14:00", "enabled": false}
  }'::jsonb,
  afterhours_mode  TEXT NOT NULL DEFAULT 'takemessage'
                     CHECK (afterhours_mode IN ('takemessage','book','off')),
  service_area     TEXT,                      -- city/state or radius description
  owner_first_name TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX businesses_owner_user_id_idx ON businesses(owner_user_id);
CREATE INDEX businesses_retell_agent_id_idx ON businesses(retell_agent_id)
  WHERE retell_agent_id IS NOT NULL;

-- ============================================================
-- TABLE 2: user_profiles
-- Extends auth.users — stores display info and business link.
-- ============================================================
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_profiles_business_id_idx ON user_profiles(business_id);

-- ============================================================
-- TABLE 3: subscriptions
-- Stripe subscription lifecycle per business.
-- All writes come from the Stripe webhook (service role).
-- ============================================================
CREATE TABLE subscriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id              UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT UNIQUE,
  stripe_subscription_id   TEXT UNIQUE,
  status                   TEXT NOT NULL DEFAULT 'trialing'
                             CHECK (status IN (
                               'trialing','active','past_due',
                               'canceled','incomplete','incomplete_expired','unpaid','paused'
                             )),
  plan                     TEXT NOT NULL DEFAULT 'pro_249',
  trial_ends_at            TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  stripe_price_id          TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_business_id_idx ON subscriptions(business_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);

-- ============================================================
-- TABLE 4: calls
-- One row per Retell call. Created/updated by webhook handler.
-- ============================================================
CREATE TABLE calls (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  retell_call_id   TEXT NOT NULL UNIQUE,
  caller_number    TEXT NOT NULL,
  caller_name      TEXT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  status           TEXT NOT NULL DEFAULT 'registered'
                     CHECK (status IN ('registered','ongoing','completed','missed','voicemail','error')),
  call_type        TEXT NOT NULL DEFAULT 'inbound'
                     CHECK (call_type IN ('inbound','outbound')),
  sentiment        TEXT CHECK (sentiment IN ('positive','neutral','frustrated')),
  job_type         TEXT CHECK (job_type IN (
                     'ac_repair','ac_not_turning_on','furnace_repair',
                     'furnace_not_turning_on','installation','maintenance',
                     'ductwork','thermostat','refrigerant','emergency','other'
                   )),
  urgency          TEXT CHECK (urgency IN ('emergency','soon','scheduled')),
  estimated_value  NUMERIC(10,2),
  recording_url    TEXT,
  summary          TEXT,                     -- Claude-generated plain-English summary
  appointment_booked BOOLEAN NOT NULL DEFAULT false,
  retell_metadata  JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX calls_business_id_idx ON calls(business_id);
CREATE INDEX calls_retell_call_id_idx ON calls(retell_call_id);
CREATE INDEX calls_started_at_idx ON calls(business_id, started_at DESC);
CREATE INDEX calls_status_idx ON calls(business_id, status);
CREATE INDEX calls_appointment_booked_idx ON calls(business_id, appointment_booked)
  WHERE appointment_booked = true;

-- ============================================================
-- TABLE 5: transcripts
-- Full conversation turns per call. Separate to keep calls lean.
-- ============================================================
CREATE TABLE transcripts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id     UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  turns       JSONB NOT NULL DEFAULT '[]',  -- [{role, content, timestamp}]
  full_text   TEXT,                          -- concatenated for FTS
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX transcripts_call_id_idx ON transcripts(call_id);
CREATE INDEX transcripts_business_id_idx ON transcripts(business_id);
-- Full-text search on transcript body
CREATE INDEX transcripts_full_text_idx ON transcripts
  USING GIN (to_tsvector('english', COALESCE(full_text, '')));

-- ============================================================
-- TABLE 6: bookings
-- Appointments created mid-call via book_appointment tool.
-- ============================================================
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id           UUID REFERENCES calls(id) ON DELETE SET NULL,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT,
  customer_address  TEXT NOT NULL,
  job_type          TEXT NOT NULL CHECK (job_type IN (
                      'ac_repair','ac_not_turning_on','furnace_repair',
                      'furnace_not_turning_on','installation','maintenance',
                      'ductwork','thermostat','refrigerant','emergency','other'
                    )),
  urgency           TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (urgency IN ('emergency','soon','scheduled')),
  notes             TEXT,
  scheduled_start   TIMESTAMPTZ,
  scheduled_end     TIMESTAMPTZ,
  calendar_event_id TEXT,                    -- Google Calendar or Calendly event ID
  status            TEXT NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  cancellation_reason TEXT,
  estimated_value   NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bookings_business_id_idx ON bookings(business_id);
CREATE INDEX bookings_call_id_idx ON bookings(call_id) WHERE call_id IS NOT NULL;
CREATE INDEX bookings_scheduled_start_idx ON bookings(business_id, scheduled_start);
CREATE INDEX bookings_status_idx ON bookings(business_id, status);
CREATE INDEX bookings_calendar_event_id_idx ON bookings(calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;
CREATE INDEX bookings_customer_phone_idx ON bookings(business_id, customer_phone);

-- ============================================================
-- TABLE 7: email_sequences
-- Tracks which drip email step each trial signup is on.
-- A cron job reads this and fires Resend emails on schedule.
-- ============================================================
CREATE TABLE email_sequences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  step         INTEGER NOT NULL DEFAULT 0,  -- day 0=welcome, 1, 3, 7, 10, 12, 14
  trial_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted    BOOLEAN NOT NULL DEFAULT false,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  last_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX email_sequences_business_email_idx ON email_sequences(business_id, email);
CREATE INDEX email_sequences_step_idx ON email_sequences(step, trial_start)
  WHERE converted = false AND unsubscribed = false;

-- ============================================================
-- TABLE 8: notifications
-- Audit log for every outbound email/SMS (Resend / Twilio).
-- Separate from email_sequences which tracks drip state.
-- ============================================================
CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  call_id             UUID REFERENCES calls(id) ON DELETE SET NULL,
  booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
  channel             TEXT NOT NULL CHECK (channel IN ('email','sms')),
  type                TEXT NOT NULL CHECK (type IN (
                        'call_summary','appointment_confirmation',
                        'appointment_reminder','appointment_cancelled',
                        'missed_call','trial_drip','payment_receipt','custom'
                      )),
  to_address          TEXT NOT NULL,
  subject             TEXT,
  body                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  provider_message_id TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_business_id_idx ON notifications(business_id);
CREATE INDEX notifications_call_id_idx ON notifications(call_id) WHERE call_id IS NOT NULL;
CREATE INDEX notifications_status_idx ON notifications(status) WHERE status = 'pending';

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- APPOINTMENT BOOKED FLAG
-- When a booking is created from a call, flip calls.appointment_booked.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_call_appointment_booked()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.call_id IS NOT NULL THEN
    UPDATE calls SET appointment_booked = true WHERE id = NEW.call_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bookings_sync_call_flag
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_call_appointment_booked();

-- ============================================================
-- RLS HELPER
-- Resolves auth.uid() → business_id in a single stable lookup.
-- ============================================================
CREATE OR REPLACE FUNCTION auth_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ── businesses ────────────────────────────────────────────────
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses: owner read"
  ON businesses FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "businesses: owner update"
  ON businesses FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ── user_profiles ─────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles: own row read"
  ON user_profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_profiles: own row update"
  ON user_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── subscriptions ─────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: business read"
  ON subscriptions FOR SELECT USING (business_id = auth_business_id());

-- All writes → Stripe webhook via service role only.

-- ── calls ─────────────────────────────────────────────────────
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls: business read"
  ON calls FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "calls: business update"
  ON calls FOR UPDATE
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

-- Inserts → Retell webhook via service role only.

-- ── transcripts ───────────────────────────────────────────────
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts: business read"
  ON transcripts FOR SELECT USING (business_id = auth_business_id());

-- ── bookings ──────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings: business read"
  ON bookings FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "bookings: business insert"
  ON bookings FOR INSERT WITH CHECK (business_id = auth_business_id());

CREATE POLICY "bookings: business update"
  ON bookings FOR UPDATE
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

CREATE POLICY "bookings: business delete"
  ON bookings FOR DELETE USING (business_id = auth_business_id());

-- ── email_sequences ───────────────────────────────────────────
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_sequences: business read"
  ON email_sequences FOR SELECT USING (business_id = auth_business_id());

-- Writes → cron job via service role only.

-- ── notifications ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: business read"
  ON notifications FOR SELECT USING (business_id = auth_business_id());

-- Writes → server-side only (service role).

-- ============================================================
-- BOOTSTRAP TRIGGERS
-- On auth.user signup → create business + user_profile rows.
-- ============================================================
CREATE OR REPLACE FUNCTION bootstrap_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id UUID;
BEGIN
  -- 1. Create the business row
  INSERT INTO public.businesses (owner_user_id, name, owner_first_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My HVAC Business'),
    NEW.raw_user_meta_data->>'first_name'
  )
  RETURNING id INTO new_business_id;

  -- 2. Create the user_profile row
  INSERT INTO public.user_profiles (id, email, full_name, business_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name'),
    new_business_id,
    'owner'
  );

  -- 3. Create the trial subscription row
  INSERT INTO public.subscriptions (business_id, status, trial_ends_at)
  VALUES (
    new_business_id,
    'trialing',
    NOW() + INTERVAL '14 days'
  );

  -- 4. Seed the email drip sequence
  INSERT INTO public.email_sequences (business_id, email, step, trial_start)
  VALUES (new_business_id, NEW.email, 0, NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION bootstrap_new_user();
