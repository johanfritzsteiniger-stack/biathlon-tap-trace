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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyJWT(token);
    
    if (!payload || payload.role !== 'admin') {
      console.log('Access denied - payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Nur Admins können Login-Zugänge erstellen' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { username, password, athleteName } = await req.json();

    if (!username || !password || !athleteName) {
      return new Response(
        JSON.stringify({ error: 'Benutzername, Passwort und Athletenname erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Hash password with SHA-256
    const passwordHash = await hashPassword(password);

    // Insert new credentials using service role key (bypasses RLS)
    const { data, error } = await supabase
      .from('user_credentials')
      .insert({
        name: username.trim(),
        password_hash: passwordHash,
        role: 'athlete',
        athlete_name: athleteName
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Benutzername existiert bereits' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Fehler beim Erstellen des Login-Zugangs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Login created for athlete:', athleteName);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create login error:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function verifyJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Invalid JWT format');
      return null;
    }

    // Dekodiere und parse das Payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Prüfe Ablaufdatum
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('JWT expired');
      return null;
    }

    // Verifiziere die Signatur
    const jwtSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureInput = `${parts[0]}.${parts[1]}`;
    const signature = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(signatureInput)
    );

    if (!isValid) {
      console.log('Invalid JWT signature');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
