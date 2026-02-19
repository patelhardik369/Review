-- NextAuth.js v5 Schema for Supabase
-- Migration: 002_nextauth_schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--
-- Name: next_auth; Type: SCHEMA;
--
CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;

--
-- Create users table
--
CREATE TABLE IF NOT EXISTS next_auth.users
(
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

GRANT ALL ON TABLE next_auth.users TO postgres;
GRANT ALL ON TABLE next_auth.users TO service_role;

-- uid() function to be used in RLS policies
CREATE OR REPLACE FUNCTION next_auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select
  	coalesce(
		nullif(current_setting('request.jwt.claim.sub', true), ''),
		(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
	)::uuid
$$;

--
-- Create sessions table
--
CREATE TABLE IF NOT EXISTS next_auth.sessions
(
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

GRANT ALL ON TABLE next_auth.sessions TO postgres;
GRANT ALL ON TABLE next_auth.sessions TO service_role;

--
-- Create accounts table (for OAuth providers)
--
CREATE TABLE IF NOT EXISTS next_auth.accounts
(
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    oauth_token_secret TEXT,
    oauth_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId")
);

GRANT ALL ON TABLE next_auth.accounts TO postgres;
GRANT ALL ON TABLE next_auth.accounts TO service_role;

--
-- Create verification_tokens table
--
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens
(
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
    CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;
GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;

--
-- RLS Policies for NextAuth tables
--

-- Users table RLS
ALTER TABLE next_auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
    ON next_auth.users FOR SELECT
    USING (id = next_auth.uid());

CREATE POLICY "Service role can manage users"
    ON next_auth.users FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Sessions table RLS
ALTER TABLE next_auth.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
    ON next_auth.sessions FOR ALL
    USING ("userId" = next_auth.uid())
    WITH CHECK ("userId" = next_auth.uid());

CREATE POLICY "Service role can manage sessions"
    ON next_auth.sessions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Accounts table RLS
ALTER TABLE next_auth.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own accounts"
    ON next_auth.accounts FOR ALL
    USING ("userId" = next_auth.uid())
    WITH CHECK ("userId" = next_auth.uid());

CREATE POLICY "Service role can manage accounts"
    ON next_auth.accounts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Verification tokens - no RLS needed (public for email verification)
ALTER TABLE next_auth.verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verification tokens"
    ON next_auth.verification_tokens FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage verification tokens"
    ON next_auth.verification_tokens FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON next_auth.sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_token ON next_auth.sessions("sessionToken");
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON next_auth.accounts("userId");
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON next_auth.accounts(provider);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON next_auth.verification_tokens(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON next_auth.verification_tokens(token);
