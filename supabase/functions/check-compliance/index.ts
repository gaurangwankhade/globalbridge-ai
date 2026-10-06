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
    const { documentText, userId } = await req.json();
    
    console.log('Compliance check request received, document length:', documentText?.length, 'userId:', userId);

    if (!documentText || !documentText.trim()) {
      return new Response(
        JSON.stringify({ error: 'Document text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input length
    if (documentText.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Document text exceeds maximum length of 50,000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are an international trade compliance expert. Analyze the following trade document for compliance issues, red flags, and regulatory risks.

Document Content:
${documentText}

Conduct a thorough compliance analysis covering:

1. RED FLAGS & CRITICAL ISSUES
   - Identify any missing, incomplete, or suspicious information
   - Flag potential fraud indicators
   - Note inconsistencies or discrepancies
   - Assign severity: "high", "medium", or "low"

2. HS CODE ANALYSIS
   - Review any product classifications or HS codes mentioned
   - Identify potential misclassifications
   - Suggest corrections or updated codes
   - Note if codes are outdated

3. TARIFF RISKS
   - Identify potential additional duties or tariffs
   - Note specific regions/countries with risks
   - Assess impact level: "high", "medium", or "low"

4. MISSING DOCUMENTATION
   - List required documents that appear to be missing
   - Consider the product type and destination
   - Include certificates, permits, and regulatory documents

5. COUNTRY-SPECIFIC REGULATIONS
   - Identify applicable regulations by destination country
   - Note special requirements (FDA, CE marking, etc.)
   - Include import restrictions or prohibitions

Format your response as JSON with this exact structure:
{
  "redFlags": [
    {
      "issue": "Description of the issue",
      "severity": "high" | "medium" | "low"
    }
  ],
  "hsCodeIssues": [
    {
      "code": "1234.56.78",
      "issue": "Brief issue description",
      "recommendation": "Suggested action or corrected code"
    }
  ],
  "tariffRisks": [
    {
      "region": "Country or region name",
      "risk": "Description of the tariff risk",
      "impact": "high" | "medium" | "low"
    }
  ],
  "missingDocs": [
    "Document name 1",
    "Document name 2"
  ],
  "countryRegulations": [
    {
      "country": "Country name",
      "regulation": "Specific regulation or requirement"
    }
  ]
}

Provide realistic, actionable insights based on actual international trade compliance requirements.`;

    console.log('Calling Lovable AI for compliance analysis...');

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
            content: 'You are an international trade compliance expert. Always respond with valid JSON only, no markdown formatting or code blocks.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
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
    
    const complianceResults = JSON.parse(aiContent);
    
    console.log('Compliance analysis complete');

    // Save to database with user_id
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: savedCheck, error: dbError } = await supabase
      .from('compliance_checks')
      .insert({
        document_text: documentText,
        user_id: userId || null,
        red_flags: complianceResults.redFlags || [],
        hs_code_issues: complianceResults.hsCodeIssues || [],
        tariff_risks: complianceResults.tariffRisks || [],
        missing_docs: complianceResults.missingDocs || [],
        country_regulations: complianceResults.countryRegulations || [],
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving to database:', dbError);
    } else {
      console.log('Compliance check saved to database:', savedCheck.id);
    }

    return new Response(
      JSON.stringify({ ...complianceResults, id: savedCheck?.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-compliance function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Compliance check failed',
        details: 'Please check your document and try again.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
