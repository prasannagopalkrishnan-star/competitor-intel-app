export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendDigestEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check - in production, use proper cron auth
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting email digest process...');

    // Get all user preferences with email delivery enabled
    const { data: userPrefs, error: prefsError } = await supabaseAdmin
      .from('user_preferences')
      .select('*, user_profiles!inner(email)')
      .eq('delivery_email', true);

    if (prefsError) {
      throw prefsError;
    }

    let emailsSent = 0;

    for (const pref of userPrefs!) {
      try {
        // Calculate time threshold for digest
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - pref.email_digest_frequency_hours);

        // Get unnotified signals for this user
        const { data: signals, error: signalsError } = await supabaseAdmin
          .from('signals')
          .select('*, competitors!inner(*)')
          .eq('user_id', pref.user_id)
          .is('notified_at', null)
          .gte('created_at', hoursAgo.toISOString())
          .order('created_at', { ascending: false });

        if (signalsError) {
          throw signalsError;
        }

        if (!signals || signals.length === 0) {
          console.log(`No new signals for user ${pref.user_id}`);
          continue;
        }

        // Group signals by competitor
        const competitorMap = new Map();
        signals.forEach((signal: any) => {
          const compId = signal.competitor_id;
          if (!competitorMap.has(compId)) {
            competitorMap.set(compId, {
              competitor: signal.competitors,
              signals: [],
            });
          }
          competitorMap.get(compId).signals.push(signal);
        });

        const digestData = Array.from(competitorMap.values());

        // Send email
        const userEmail = (pref as any).user_profiles.email;
        const success = await sendDigestEmail(userEmail, digestData);

        if (success) {
          // Mark signals as notified
          const signalIds = signals.map((s: any) => s.id);
          await supabaseAdmin
            .from('signals')
            .update({ notified_at: new Date().toISOString() })
            .in('id', signalIds);

          emailsSent++;
          console.log(`Sent digest to ${userEmail} with ${signals.length} signals`);
        }
      } catch (error) {
        console.error(`Error processing digest for user ${pref.user_id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email digest process completed. Sent ${emailsSent} emails.`,
      emailsSent,
    });
  } catch (error: any) {
    console.error('Error in email digest process:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
