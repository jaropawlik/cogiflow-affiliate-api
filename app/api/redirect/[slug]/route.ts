import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for write operations

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Type definition for affiliate links
interface AffiliateLink {
  id: string;
  slug: string;
  redirect_url: string;
  fallback_url?: string;
  clicks: number;
  created_at: string;
  active: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Validate slug parameter
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      console.error('Invalid or missing slug parameter');
      return NextResponse.redirect('https://cogiflow.ai', {
        status: 301,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    }

    // Sanitize slug (remove any potentially harmful characters)
    const sanitizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    
    if (sanitizedSlug !== slug.trim().toLowerCase()) {
      console.error(`Slug contains invalid characters: ${slug}`);
      return NextResponse.redirect('https://cogiflow.ai', {
        status: 301,
        headers: {
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Query the affiliate_links table
    const { data: affiliateLink, error: fetchError } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('slug', sanitizedSlug)
      .eq('active', true)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows found - redirect to default URL
        console.log(`No affiliate link found for slug: ${sanitizedSlug}`);
        return NextResponse.redirect('https://cogiflow.ai', {
          status: 301,
          headers: {
            'Cache-Control': 'public, max-age=300',
          },
        });
      } else {
        // Database error
        console.error('Database error:', fetchError);
        return NextResponse.redirect('https://cogiflow.ai', {
          status: 301,
          headers: {
            'Cache-Control': 'public, max-age=60', // Shorter cache for errors
          },
        });
      }
    }

    if (!affiliateLink) {
      console.log(`No affiliate link found for slug: ${sanitizedSlug}`);
      return NextResponse.redirect('https://cogiflow.ai', {
        status: 301,
        headers: {
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Increment the clicks counter atomically
    console.log(`Attempting to update clicks for ID: ${affiliateLink.id}, current clicks: ${affiliateLink.clicks}`);
    
    const { data: updateData, error: updateError } = await supabase
      .from('affiliate_links')
      .update({ 
        clicks: (affiliateLink.clicks || 0) + 1
      })
      .eq('id', affiliateLink.id)
      .select();

    if (updateError) {
      console.error('Error updating clicks counter:', updateError);
      // Don't fail the redirect if click tracking fails
    } else {
      console.log('Clicks updated successfully:', updateData);
    }

    // Determine redirect URL
    let redirectUrl = affiliateLink.redirect_url;
    
    // Use fallback URL if primary URL is empty or invalid
    if (!redirectUrl || !isValidUrl(redirectUrl)) {
      redirectUrl = affiliateLink.fallback_url || 'https://cogiflow.ai';
    }

    // Final validation of redirect URL
    if (!isValidUrl(redirectUrl)) {
      console.error(`Invalid redirect URL: ${redirectUrl}`);
      redirectUrl = 'https://cogiflow.ai';
    }

    // Log successful redirect
    console.log(`Redirecting slug "${sanitizedSlug}" to: ${redirectUrl}`);

    // Return HTML that opens link in new window
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Przekierowanie - Cogiflow.ai</title>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          text-align: center; 
          padding: 50px 20px;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .container { 
          max-width: 500px; 
          background: rgba(255,255,255,0.1); 
          padding: 40px; 
          border-radius: 20px; 
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .spinner { 
          width: 40px; 
          height: 40px; 
          border: 4px solid rgba(255,255,255,0.3); 
          border-top-color: white; 
          border-radius: 50%; 
          animation: spin 1s linear infinite; 
          margin: 20px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        a { color: #a8c8ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Przekierowanie...</h1>
        <div class="spinner"></div>
        <p>Otwieramy <strong>${new URL(redirectUrl).hostname}</strong> w nowej zakładce</p>
        <p><small>Jeśli nic się nie dzieje, <a href="${redirectUrl}" target="_blank">kliknij tutaj</a></small></p>
      </div>
      <script>
        // Open in new tab/window
        window.open('${redirectUrl}', '_blank');
        
        // Show confirmation message
        setTimeout(() => {
          document.querySelector('.container').innerHTML = \`
            <h1>✅ Sukces!</h1>
            <p>Otworzyliśmy <strong>${new URL(redirectUrl).hostname}</strong> w nowej zakładce</p>
            <p><a href="${redirectUrl}" target="_blank">Kliknij ponownie</a> jeśli nic się nie otworzyło</p>
            <p><small><a href="https://cogiflow.ai">← Powrót do Cogiflow.ai</a></small></p>
          \`;
        }, 1500);
      </script>
    </body>
    </html>`;

    // Return HTML response instead of redirect
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Cogiflow-Affiliate': affiliateLink.id,
        'X-Cogiflow-Clicks': String((affiliateLink.clicks || 0) + 1),
      },
    });

  } catch (error) {
    console.error('Unexpected error in affiliate redirect:', error);
    
    // Return a safe redirect in case of any unexpected errors
    return NextResponse.redirect('https://cogiflow.ai', {
      status: 301,
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
}

// Helper function to validate URLs
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Optional: Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 