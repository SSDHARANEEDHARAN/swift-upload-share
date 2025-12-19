import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, fromColor, toColor } = await req.json();

    if (!image || !fromColor || !toColor) {
      return new Response(
        JSON.stringify({ error: 'Image, fromColor, and toColor are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Recoloring from', fromColor, 'to', toColor);

    // Analyze image first
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Describe this image in detail. I want to change the ${fromColor} elements to ${toColor}. Describe what the result should look like.`
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error('Failed to analyze image');
    }

    const analysisData = await analysisResponse.json();
    const description = analysisData.choices[0].message.content;

    // Generate recolored version
    const genResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `Recreate this image exactly but change all ${fromColor} colors to ${toColor}: ${description}`,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!genResponse.ok) {
      const errorData = await genResponse.text();
      console.error('Generation error:', errorData);
      throw new Error('Failed to recolor image');
    }

    const genData = await genResponse.json();
    console.log('Image recolored successfully');

    return new Response(
      JSON.stringify({ image: genData.data[0].b64_json || genData.data[0].url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in recolor-image function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
