import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const dummyHash = 'pbkdf2:sha256:100000$dummy$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const hashToVerify = user?.password_hash || dummyHash;
    
    let isValidPassword = false;
    
    // Check if hash is PBKDF2 format or old SHA-256
    if (hashToVerify.startsWith('pbkdf2:')) {
      isValidPassword = await verifyPasswordPBKDF2(password, hashToVerify);
    } else {
      // Old SHA-256 format - verify and migrate
      if (user) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (sha256Hash === user.password_hash) {
          // Password correct but using old hash - migrate to PBKDF2
          isValidPassword = true;
          const newHash = await hashPasswordPBKDF2(password);
          await supabase
            .from('user_credentials')
            .update({ password_hash: newHash })
            .eq('id', user.id);
          console.log('Migrated password to PBKDF2 for user:', name);
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

async function hashPasswordPBKDF2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `pbkdf2:sha256:100000$${saltHex}$${hashHex}`;
}

async function verifyPasswordPBKDF2(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    
    const [algorithm, saltHex, hashHex] = parts;
    if (!algorithm.startsWith('pbkdf2:sha256:100000')) return false;
    
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      256
    );
    
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const computedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return computedHashHex === hashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

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
