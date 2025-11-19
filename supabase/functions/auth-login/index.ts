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

    // Suche Benutzer case-insensitive
    const { data: user, error: userError } = await supabase
      .from('user_credentials')
      .select('*')
      .ilike('name', name)
      .single();

    if (userError || !user) {
      console.log('User not found:', name);
      return new Response(
        JSON.stringify({ error: 'Ungültiger Name oder Passwort' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Überprüfe Passwort mit Web Crypto API
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', name);
      return new Response(
        JSON.stringify({ error: 'Ungültiger Name oder Passwort' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Erstelle JWT Token
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

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Hash das eingegebene Passwort mit SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Vergleiche mit dem gespeicherten Hash
    return hashHex === hash;
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
    exp: now + (60 * 60 * 24 * 7), // 7 Tage
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const jwtSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
