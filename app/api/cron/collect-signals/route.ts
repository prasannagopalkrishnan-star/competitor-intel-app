import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { gatherCompetitorNews, generateContentHash } from '@/lib/news';
import { analyzeSignal } from '@/lib/claude';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check - in production, use proper cron auth
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting signal collection...');

    // Get all competitors
    const { data: competitors, error: competitorsError } = await supabaseAdmin
      .from('competitors')
      .select('*');

    if (competitorsError) {
      throw competitorsError;
    }

    let totalSignalsCreated = 0;

    for (const competitor of competitors!) {
      try {
        // Gather news
        const articles = await gatherCompetitorNews(
          competitor.name,
          competitor.website,
          competitor.rss_feeds
        );

        console.log(`Found ${articles.length} articles for ${competitor.name}`);

        // Process each article
        for (const article of articles) {
          try {
            // Generate content hash for deduplication
            const contentHash = generateContentHash(article.title + article.url);

            // Check if we've already processed this
            const { data: existing } = await supabaseAdmin
              .from('signals')
              .select('id')
              .eq('content_hash', contentHash)
              .single();

            if (existing) {
              console.log(`Skipping duplicate: ${article.title}`);
              continue;
            }

            // Analyze the signal with Claude
            const analysis = await analyzeSignal(competitor.name, article);

            // Get user preferences to filter by signal type
            const { data: prefs } = await supabaseAdmin
              .from('user_preferences')
              .select('signal_types')
              .eq('user_id', competitor.user_id)
              .single();

            // Skip if user doesn't want this signal type
            if (prefs && !prefs.signal_types.includes(analysis.signalType)) {
              console.log(`Skipping ${analysis.signalType} - not in user preferences`);
              continue;
            }

            // Create signal
            const { error: insertError } = await supabaseAdmin
              .from('signals')
              .insert({
                competitor_id: competitor.id,
                user_id: competitor.user_id,
                title: article.title,
                summary: analysis.summary,
                signal_type: analysis.signalType,
                sentiment: analysis.sentiment,
                source_url: article.url,
                source_name: article.source,
                is_high_priority: analysis.isHighPriority,
                published_at: article.publishedAt,
                content_hash: contentHash,
              });

            if (insertError) {
              console.error('Error inserting signal:', insertError);
            } else {
              totalSignalsCreated++;
              console.log(`Created signal: ${article.title}`);
            }
          } catch (error) {
            console.error(`Error processing article "${article.title}":`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing competitor ${competitor.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Signal collection completed. Created ${totalSignalsCreated} new signals.`,
      totalSignalsCreated,
    });
  } catch (error: any) {
    console.error('Error in signal collection:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
