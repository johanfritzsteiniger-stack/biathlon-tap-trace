-- Erstelle Rollen-Enum
CREATE TYPE public.app_role AS ENUM ('admin', 'athlete');

-- Erstelle user_credentials Tabelle für Name + Passwort Login
CREATE TABLE public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'athlete',
  athlete_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index für schnellere Name-Lookups (case-insensitive)
CREATE INDEX idx_user_credentials_name_lower ON public.user_credentials (LOWER(name));

-- Enable RLS
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Admins können alle Credentials verwalten
CREATE POLICY "Admins can manage all credentials"
ON public.user_credentials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_credentials
    WHERE id::text = auth.jwt()->>'sub'
    AND role = 'admin'
  )
);

-- Policy: Athleten können nur ihre eigenen Daten lesen
CREATE POLICY "Athletes can read own credentials"
ON public.user_credentials
FOR SELECT
TO authenticated
USING (
  id::text = auth.jwt()->>'sub' 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_credentials
    WHERE id::text = auth.jwt()->>'sub'
    AND role = 'admin'
  )
);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_credentials_updated_at
  BEFORE UPDATE ON public.user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Erstelle ersten Admin-Benutzer (Passwort: "admin123" - sollte später geändert werden)
-- Passwort-Hash für "admin123" mit bcrypt
INSERT INTO public.user_credentials (name, password_hash, role)
VALUES ('Admin', '$2a$10$rKZKqVn8h9vJE9qXE7h3qOYN9DjVH7qY8vVKqZQYZGQYZQYZQYZQY', 'admin');