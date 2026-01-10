'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Competitor, Signal } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  async function checkAuthAndLoadData() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    setUserEmail(session.user.email || '');

    // Check if user has completed setup
    const { data: competitorData } = await supabase
      .from('competitors')
      .select('*')
      .eq('user_id', session.user.id);

    if (!competitorData || competitorData.length === 0) {
      router.push('/setup');
      return;
    }

    setCompetitors(competitorData);
    if (competitorData.length > 0) {
      setSelectedCompetitor(competitorData[0].id);
    }

    await loadSignals(session.user.id);
    setLoading(false);
  }

  async function loadSignals(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSignals(data);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredSignals = selectedCompetitor
    ? signals.filter(s => s.competitor_id === selectedCompetitor)
    : signals;

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSentimentBg = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500 bg-opacity-10 border-green-400';
      case 'negative':
        return 'bg-red-500 bg-opacity-10 border-red-400';
      default:
        return 'bg-gray-500 bg-opacity-10 border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
      {/* Header */}
      <header className="glass-morphism border-b border-white border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎯</span>
              <h1 className="text-2xl font-bold text-white">Competitor Intelligence</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Competitor List */}
          <div className="lg:col-span-1">
            <div className="glass-morphism rounded-2xl p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-white mb-4">Competitors</h2>
              
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCompetitor(null)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    selectedCompetitor === null
                      ? 'bg-white text-purple-600 font-semibold'
                      : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
                >
                  All Competitors
                  <span className="float-right text-sm">
                    {signals.length}
                  </span>
                </button>
                
                {competitors.map((competitor) => {
                  const count = signals.filter(s => s.competitor_id === competitor.id).length;
                  return (
                    <button
                      key={competitor.id}
                      onClick={() => setSelectedCompetitor(competitor.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedCompetitor === competitor.id
                          ? 'bg-white text-purple-600 font-semibold'
                          : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                      }`}
                    >
                      {competitor.name}
                      <span className="float-right text-sm">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Signals */}
          <div className="lg:col-span-3">
            <div className="glass-morphism rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {selectedCompetitor
                    ? competitors.find(c => c.id === selectedCompetitor)?.name
                    : 'All Signals'}
                </h2>
                <span className="text-purple-100 text-sm">
                  {filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''} (Last 30 days)
                </span>
              </div>

              {filteredSignals.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📡</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No signals yet</h3>
                  <p className="text-purple-100">
                    We're monitoring your competitors. New signals will appear here soon!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSignals.map((signal) => {
                    const competitor = competitors.find(c => c.id === signal.competitor_id);
                    return (
                      <div
                        key={signal.id}
                        className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-5 border border-white border-opacity-20 hover:bg-opacity-20 transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {selectedCompetitor === null && competitor && (
                                <span className="px-2 py-1 bg-white bg-opacity-20 text-white text-xs rounded-full font-medium">
                                  {competitor.name}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-purple-500 bg-opacity-30 text-white text-xs rounded-full font-medium uppercase">
                                {signal.signal_type.replace(/_/g, ' ')}
                              </span>
                              {signal.sentiment && (
                                <span className={`px-2 py-1 ${getSentimentBg(signal.sentiment)} text-white text-xs rounded-full font-medium border`}>
                                  {signal.sentiment}
                                </span>
                              )}
                              {signal.is_high_priority && (
                                <span className="px-2 py-1 bg-yellow-500 bg-opacity-30 text-yellow-100 text-xs rounded-full font-medium border border-yellow-400">
                                  ⭐ High Priority
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {signal.title}
                            </h3>
                          </div>
                        </div>

                        <p className="text-purple-50 mb-3 leading-relaxed">
                          {signal.summary}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-white border-opacity-10">
                          <a
                            href={signal.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-purple-200 font-medium text-sm flex items-center gap-1"
                          >
                            Read full article →
                          </a>
                          <span className="text-purple-200 text-sm">
                            {signal.created_at && formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
