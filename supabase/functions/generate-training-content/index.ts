import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, num_modules = 4, language = "nl", extra_instructions = "" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!topic || topic.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please provide a topic" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langMap: Record<string, string> = { nl: "Nederlands", fr: "Français", en: "English" };
    const lang = langMap[language] || "Nederlands";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert training content creator for volunteer organizations. Generate detailed, professional training content in ${lang}. The content should be practical, engaging, and suitable for volunteers. Each module should contain multiple content blocks (headings, text paragraphs, and relevant image suggestions). Keep text blocks informative but digestible (2-4 paragraphs per text block). Include safety procedures, best practices, and practical tips where relevant.`,
          },
          {
            role: "user",
            content: `Create a complete training program about: "${topic}"
${extra_instructions ? `\nAdditional instructions: ${extra_instructions}` : ''}

Generate ${num_modules} modules. Each module should have 4-8 content blocks mixing headings, subheadings, text paragraphs, and image suggestions.

For images, suggest relevant Unsplash search terms (I'll convert them to URLs).`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_training",
              description: "Generate a complete training program with modules and content blocks",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Training title" },
                  description: { type: "string", description: "Short training description (1-2 sentences)" },
                  modules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Module title" },
                        blocks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: { type: "string", enum: ["heading", "subheading", "text", "image", "divider"] },
                              value: { type: "string", description: "Content text, or for images: a Unsplash search query" },
                              style: {
                                type: "object",
                                properties: {
                                  fontSize: { type: "string", enum: ["sm", "base", "lg", "xl", "2xl", "3xl"] },
                                  bold: { type: "boolean" },
                                  align: { type: "string", enum: ["left", "center", "right"] },
                                },
                                additionalProperties: false,
                              },
                            },
                            required: ["type", "value"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["title", "blocks"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "modules"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_training" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const training = JSON.parse(toolCall.function.arguments);

    // Convert image blocks: turn Unsplash search queries into actual URLs
    for (const mod of training.modules) {
      for (const block of mod.blocks) {
        if (block.type === "image" && block.value && !block.value.startsWith("http")) {
          block.value = `https://images.unsplash.com/photo-1?w=800&q=80&auto=format&fit=crop&fm=jpg&ixlib=rb-4.0.3&s=${encodeURIComponent(block.value)}`;
          // Use a more reliable approach: source.unsplash.com
          block.value = `https://source.unsplash.com/800x400/?${encodeURIComponent(block.value)}`;
        }
        // Add default styles
        if (block.type === "heading" && !block.style) {
          block.style = { fontSize: "2xl", bold: true };
        } else if (block.type === "subheading" && !block.style) {
          block.style = { fontSize: "lg", bold: true };
        }
        // Add unique id
        block.id = crypto.randomUUID();
      }
    }

    return new Response(JSON.stringify(training), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-training-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
