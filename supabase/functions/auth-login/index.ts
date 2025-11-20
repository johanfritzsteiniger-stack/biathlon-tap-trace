import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return new Response(
        JSON.stringify({ error: 'Name und Passwort erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limiting - 5 failed attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from('login_attempts')
      .select('*')
      .ilike('username', name)
      .eq('success', false)
      .gte('attempt_time', fifteenMinutesAgo);

    if (recentAttempts && recentAttempts.length >= 5) {
      console.log('Rate limit exceeded for user:', name);
      return new Response(
        JSON.stringify({ error: 'Zu viele fehlgeschlagene Versuche. Bitte versuchen Sie es in 15 Minuten erneut.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for user case-insensitive
    const { data: user, error: userError } = await supabase
      .from('user_credentials')
      .select('*')
      .ilike('name', name)
      .single();

    // Always verify password even if user not found (timing attack prevention)
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const hashToVerify = user?.password_hash || dummyHash;
    
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, hashToVerify);
    } catch (error) {
      // Hash might be old SHA-256 format, try to verify and migrate
      if (user) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (sha256Hash === user.password_hash) {
          // Password correct but using old hash - migrate to bcrypt
          isValidPassword = true;
          const newHash = await bcrypt.hash(password);
          await supabase
            .from('user_credentials')
            .update({ password_hash: newHash })
            .eq('id', user.id);
          console.log('Migrated password to bcrypt for user:', name);
        }
      }
    }

    // Log attempt
    await supabase
      .from('login_attempts')
      .insert({
        username: name,
        success: !!(user && isValidPassword),
        attempt_time: new Date().toISOString()
      });

    if (!user || !isValidPassword) {
      console.log('Login attempt failed');
      return new Response(
        JSON.stringify({ error: 'Ungültiger Name oder Passwort' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT Token with dedicated secret
    const token = await createJWT(user);

    console.log('Login successful for user:', name);

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          athleteName: user.athlete_name,
        },
        token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createJWT(user: any) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    athleteName: user.athlete_name,
    iat: now,
    exp: now + (60 * 60), // 1 hour for better security
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const jwtSecret = Deno.env.get('JWT_SECRET')!;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(jwtSecret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${encodedSignature}`;
}
