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

    // Minimal HTML that opens new window and shows confirmation
    const html = `<!DOCTYPE html>
<html>
<head>
<title>Link otworzony</title>
<style>
body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
.container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
h1 { color: #10b981; margin: 0 0 20px 0; }
p { color: #6b7280; margin: 10px 0; }
a { color: #7c3aed; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
<h1>✅ Link otworzony!</h1>
<p>Otwieraliśmy <strong>${new URL(redirectUrl).hostname}</strong> w nowym oknie</p>
<p><a href="https://cogiflow.ai">← Powrót do Cogiflow.ai</a></p>
</div>
<script>
// Create invisible link and auto-click it (bypasses popup blockers)
const link = document.createElement('a');
link.href = '${redirectUrl}';
link.target = '_blank';
link.rel = 'noopener noreferrer';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
</script>
</body>
</html>`;

    // Return minimal HTML response
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