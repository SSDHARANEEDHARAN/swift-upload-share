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
    const { image, scale } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetScale = scale || 2;
    console.log('Upscaling image by', targetScale, 'x');

    // Use GPT-4o to analyze and enhance the image
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
                text: 'Describe this image in extreme detail for recreation at higher resolution. Include colors, textures, subjects, lighting, style, and composition.'
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
      const errorData = await analysisResponse.text();
      console.error('Analysis error:', errorData);
      throw new Error('Failed to analyze image');
    }

    const analysisData = await analysisResponse.json();
    const description = analysisData.choices[0].message.content;

    // Generate high-quality version
    const size = targetScale >= 3 ? '1792x1024' : '1024x1024';
    
    const genResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `Create a high-resolution, ultra-detailed version of this image: ${description}. Make it extremely sharp, clear, and detailed.`,
        n: 1,
        size: size,
        quality: 'high',
      }),
    });

    if (!genResponse.ok) {
      const errorData = await genResponse.text();
      console.error('Generation error:', errorData);
      throw new Error('Failed to generate upscaled image');
    }

    const genData = await genResponse.json();
    console.log('Image upscaled successfully');

    return new Response(
      JSON.stringify({ 
        image: genData.data[0].b64_json || genData.data[0].url,
        scale: targetScale
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in upscale-image function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
