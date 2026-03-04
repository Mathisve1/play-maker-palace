import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_NAMES: Record<string, string> = {
  nl: "Dutch",
  fr: "French",
  en: "English",
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { source_table, source_id, source_field, text, target_language } = await req.json();

    if (!text || !target_language || !source_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sourceHash = simpleHash(text);

    // Check cache
    const { data: cached } = await supabase
      .from("content_translations")
      .select("translated_text, source_hash")
      .eq("source_table", source_table)
      .eq("source_id", source_id)
      .eq("source_field", source_field)
      .eq("target_language", target_language)
      .maybeSingle();

    if (cached && cached.source_hash === sourceHash) {
      return new Response(JSON.stringify({ translated_text: cached.translated_text, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI proxy for translation
    const targetLangName = LANGUAGE_NAMES[target_language] || target_language;
    
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional translator for a Belgian volunteer management platform. Translate the following text to ${targetLangName}. Keep it natural, use Belgian terminology where appropriate. Only output the translated text, nothing else. If the text is already in the target language, return it unchanged.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI translation error:", errText);
      return new Response(JSON.stringify({ translated_text: text, error: "Translation failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices?.[0]?.message?.content?.trim() || text;

    // Cache the translation
    await supabase
      .from("content_translations")
      .upsert({
        source_table,
        source_id,
        source_field,
        target_language,
        translated_text: translatedText,
        source_hash: sourceHash,
        updated_at: new Date().toISOString(),
      }, { onConflict: "source_table,source_id,source_field,target_language" });

    return new Response(JSON.stringify({ translated_text: translatedText, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
