'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SignalType } from '@/lib/types';

const SIGNAL_TYPES: { value: SignalType; label: string }[] = [
  { value: 'product_launch', label: 'Product Launches' },
  { value: 'funding', label: 'Funding Announcements' },
  { value: 'leadership_change', label: 'Leadership Changes' },
  { value: 'earnings_report', label: 'Earnings Reports' },
  { value: 'social_media', label: 'Social Media Mentions' },
  { value: 'blog_post', label: 'Company Blog Posts' },
];

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [competitors, setCompetitors] = useState<Array<{ name: string; website: string; rssFeeds: string }>>([
    { name: '', website: '', rssFeeds: '' },
  ]);
  
  const [selectedSignalTypes, setSelectedSignalTypes] = useState<SignalType[]>([
    'product_launch',
    'funding',
    'leadership_change',
    'earnings_report',
  ]);
  
  const [deliveryEmail, setDeliveryEmail] = useState(true);
  const [deliveryDashboard, setDeliveryDashboard] = useState(true);
  const [checksPerDay, setChecksPerDay] = useState(6);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    setUserId(session.user.id);
    
    // Create user profile if it doesn't exist
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: session.user.id,
        email: session.user.email!,
      }, {
        onConflict: 'id'
      });

    if (error) console.error('Error creating user profile:', error);
  }

  const addCompetitor = () => {
    if (competitors.length < 6) {
      setCompetitors([...competitors, { name: '', website: '', rssFeeds: '' }]);
    }
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const updateCompetitor = (index: number, field: string, value: string) => {
    const updated = [...competitors];
    updated[index] = { ...updated[index], [field]: value };
    setCompetitors(updated);
  };

  const toggleSignalType = (type: SignalType) => {
    if (selectedSignalTypes.includes(type)) {
      setSelectedSignalTypes(selectedSignalTypes.filter(t => t !== type));
    } else {
      setSelectedSignalTypes([...selectedSignalTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      alert('Please log in first');
      return;
    }

    const validCompetitors = competitors.filter(c => c.name.trim() !== '');
    
    if (validCompetitors.length === 0) {
      alert('Please add at least one competitor');
      return;
    }

    setLoading(true);

    try {
      // Insert competitors
      const competitorInserts = validCompetitors.map(c => ({
        user_id: userId,
        name: c.name.trim(),
        website: c.website.trim() || null,
        rss_feeds: c.rssFeeds.trim() ? c.rssFeeds.split(',').map(f => f.trim()) : null,
      }));

      const { error: competitorError } = await supabase
        .from('competitors')
        .insert(competitorInserts);

      if (competitorError) throw competitorError;

      // Insert user preferences
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          signal_types: selectedSignalTypes,
          delivery_email: deliveryEmail,
          delivery_dashboard: deliveryDashboard,
          check_frequency_hours: Math.floor(24 / checksPerDay),
          email_digest_frequency_hours: 12,
        });

      if (prefsError) throw prefsError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error saving setup:', error);
      alert('Error saving setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto py-12">
        <div className="glass-morphism rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Setup Your Intelligence</h1>
            <p className="text-purple-100">Configure your competitors and preferences</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Competitors Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">Competitors</h2>
                {competitors.length < 6 && (
                  <button
                    type="button"
                    onClick={addCompetitor}
                    className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition"
                  >
                    + Add Competitor
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {competitors.map((competitor, index) => (
                  <div key={index} className="bg-white bg-opacity-10 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Competitor {index + 1}</span>
                      {competitors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCompetitor(index)}
                          className="text-red-300 hover:text-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Company name *"
                      value={competitor.name}
                      onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                    
                    <input
                      type="url"
                      placeholder="Website URL (optional)"
                      value={competitor.website}
                      onChange={(e) => updateCompetitor(index, 'website', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    
                    <input
                      type="text"
                      placeholder="RSS feed URLs (comma-separated, optional)"
                      value={competitor.rssFeeds}
                      onChange={(e) => updateCompetitor(index, 'rssFeeds', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Signal Types Section */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">Signal Types to Track</h2>
              <div className="grid grid-cols-2 gap-3">
                {SIGNAL_TYPES.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center space-x-3 bg-white bg-opacity-10 p-4 rounded-lg cursor-pointer hover:bg-opacity-20 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSignalTypes.includes(value)}
                      onChange={() => toggleSignalType(value)}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Delivery Preferences */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">Delivery Preferences</h2>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 bg-white bg-opacity-10 p-4 rounded-lg cursor-pointer hover:bg-opacity-20 transition">
                  <input
                    type="checkbox"
                    checked={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">Email Digest</span>
                    <p className="text-purple-100 text-sm">Receive signals via email twice daily</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 bg-white bg-opacity-10 p-4 rounded-lg cursor-pointer hover:bg-opacity-20 transition">
                  <input
                    type="checkbox"
                    checked={deliveryDashboard}
                    onChange={(e) => setDeliveryDashboard(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">Dashboard</span>
                    <p className="text-purple-100 text-sm">View all signals in your dashboard</p>
                  </div>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-white font-medium mb-2">
                  Check Frequency: {checksPerDay}x per day
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="2"
                  value={checksPerDay}
                  onChange={(e) => setChecksPerDay(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-purple-100 mt-1">
                  <span>Less frequent</span>
                  <span>More frequent</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-white text-purple-600 font-bold text-lg rounded-xl hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Complete Setup & Go to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
