import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, cargoType, weight, volume, transportMode, userId } = await req.json();
    
    console.log('Route optimization request:', { origin, destination, cargoType, weight, volume, transportMode, userId });

    // Input validation
    if (!origin || !destination || !cargoType) {
      return new Response(
        JSON.stringify({ error: 'Origin, destination, and cargo type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (origin.length > 200 || destination.length > 200 || cargoType.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Input fields exceed maximum length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are a logistics optimization expert. Analyze the following shipment requirements and provide optimized shipping routes.

Shipment Details:
- Origin: ${origin}
- Destination: ${destination}
- Cargo Type: ${cargoType}
- Weight: ${weight} kg
- Volume: ${volume} m³
- Transport Mode: ${transportMode}

Provide 3 route options (1 recommended + 2 alternatives) with realistic details:
1. A recommended route with the best balance of cost, time, and environmental impact
2. Two alternative routes with different trade-offs

For each route include:
- Detailed route path with intermediate ports/hubs
- Estimated transit time
- Estimated cost in USD
- Carbon footprint in tons CO₂
- Recommended carrier company

Consider factors like:
- Current shipping lanes and common routes
- Cargo type requirements (temperature control, hazmat handling, etc.)
- Transport mode efficiency
- Seasonal conditions
- Port congestion
- Fuel efficiency and environmental impact

Format your response as JSON with this structure:
{
  "recommended": {
    "route": "Port A → Port B → Port C",
    "time": "X days",
    "cost": "$X,XXX",
    "carbon": "X.X tons CO₂",
    "carrier": "Carrier Name"
  },
  "alternatives": [
    {
      "route": "Port A → Port D → Port C",
      "time": "X days",
      "cost": "$X,XXX",
      "carbon": "X.X tons CO₂",
      "carrier": "Carrier Name"
    },
    {
      "route": "Port A → Port E → Port C",
      "time": "X days",
      "cost": "$X,XXX",
      "carbon": "X.X tons CO₂",
      "carrier": "Carrier Name"
    }
  ]
}`;

    console.log('Calling Lovable AI for route optimization...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a logistics optimization expert. Always respond with valid JSON only, no markdown formatting or code blocks.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    let aiContent = data.choices[0].message.content;
    
    // Clean up response - remove markdown code blocks if present
    aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const routeResults = JSON.parse(aiContent);
    
    console.log('Route optimization successful');

    // Save to database with user_id
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: savedRoute, error: dbError } = await supabase
      .from('route_optimizations')
      .insert({
        origin,
        destination,
        cargo_type: cargoType,
        weight: weight || 0,
        volume: volume || 0,
        transport_mode: transportMode,
        user_id: userId || null,
        recommended_route: routeResults.recommended,
        alternative_routes: routeResults.alternatives,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving to database:', dbError);
    } else {
      console.log('Route saved to database:', savedRoute.id);
    }

    return new Response(
      JSON.stringify({ ...routeResults, id: savedRoute?.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in optimize-route function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Route optimization failed',
        details: 'Please check your input and try again.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
