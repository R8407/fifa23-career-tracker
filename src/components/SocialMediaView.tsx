import React, { useState, useMemo } from 'react';
import { MessageSquare, Heart, MessageCircle, Share2, Send, Star, Briefcase, Trophy } from 'lucide-react';
import careerExportData from '../data/career_export.json';
import { generateDMReply, isLLMAvailable } from '../utils/llm';

interface FeedPost {
  id: string;
  author: string;
  handle: string;
  flag: string;
  verified: boolean;
  content: string;
  likes: number;
  replies: number;
  timeAgo: string;
}

interface DirectMessage {
  id: string;
  sender: string;
  handle: string;
  flag: string;
  role: string;
  content: string;
  timeAgo: string;
  read: boolean;
}

const MOCK_DMS: DirectMessage[] = [
  { id: 'dm1', sender: 'Thierry Henry', handle: '@TitiHenry', flag: '\u{1F1EB}\u{E0067}', role: 'legend', content: 'I have been watching your progress closely. 16 assists shows real vision. Keep developing that final ball -- you have the potential to be one of the greats.', timeAgo: '1h', read: false },
  { id: 'dm2', sender: 'Jorge Mendes', handle: '@JorgeMendes', flag: '\u{1F1F5}\u{E0067}', role: 'agent', content: 'There will be interest from top clubs. Let us discuss your future. My office is always open.', timeAgo: '3h', read: false },
  { id: 'dm3', sender: 'Your Coach', handle: '@SpeziaCoach', flag: '\u{1F1EE}\u{E0067}', role: 'coach', content: 'Good work this season. Avg rating of 7.67 shows real improvement. Focus on defensive contribution next.', timeAgo: '6h', read: true },
  { id: 'dm4', sender: 'Gary Lineker', handle: '@GaryLineker', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'legend', content: 'Young man, your performances have caught my eye. The football world is watching. Keep your head down and keep working.', timeAgo: '1d', read: true },
  { id: 'dm5', sender: 'Your Agent', handle: '@PlayerAgent', flag: '\u{1F1FA}\u{E0067}', role: 'agent', content: 'Season review: Excellent debut. 4G 16A with avg rating 7.67. Market value will increase significantly.', timeAgo: '2d', read: true },
];

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generatePosts(data: any): FeedPost[] {
  const profile = data.my_player_profile || {};
  const goals = data.total_goals || 0;
  const assists = data.total_assists || 0;
  const ovr = parseInt(profile.overallrating || '65');
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Your Player';
  const motmTotal = seasons.reduce((sum: number, s: any) => sum + (s.motm || 0), 0);
  const avgRating = seasons.length > 0
    ? (seasons.reduce((sum: number, s: any) => sum + (parseFloat(s.avgRating) || 0), 0) / seasons.length).toFixed(1)
    : '0.0';
  const seasonGoals = seasons.length > 0 ? (seasons[0].goals || 0) : 0;
  const seasonAssists = seasons.length > 0 ? (seasons[0].assists || 0) : 0;

  const accounts = [
    { name: 'Football Daily', handle: '@FootballDaily', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: true },
    { name: 'ESPN FC', handle: '@ESPNFC', flag: '\u{1F1FA}\u{E0067}', verified: true },
    { name: 'Sky Sports', handle: '@SkySports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: true },
    { name: 'Marca', handle: '@marca', flag: '\u{1F1EA}\u{E0067}', verified: true },
    { name: 'CBS Sports Golazo', handle: '@CBSSportsGolazo', flag: '\u{1F1FA}\u{E0067}', verified: true },
    { name: 'The Guardian', handle: '@GuardianFootball', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: true },
    { name: 'Football Fan Zone', handle: '@FanZone', flag: '\u{1F30D}', verified: false },
    { name: 'Tactics Today', handle: '@TacticsToday', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: false },
    { name: 'Serie A Watch', handle: '@SerieAWatch', flag: '\u{1F1EE}\u{E0067}', verified: false },
    { name: 'Rising Stars FC', handle: '@RisingStarsFC', flag: '\u{1F30D}', verified: false },
    { name: 'Premier League Fans', handle: '@PLFans', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: false },
    { name: 'La Liga World', handle: '@LaLigaWorld', flag: '\u{1F1EA}\u{E0067}', verified: false },
  ];

  const posts: FeedPost[] = [];
  let id = 0;

  // Pro-Ampadu posts
  const proPosts = [
    () => `${playerName} is the most underrated player in Serie A right now. ${goals} goals and ${assists} assists -- name another youngster doing this!`,
    () => `FACT: ${playerName} has ${motmTotal} MOTM awards. Most senior players do not have that in their entire career. DIFFERENT GRADE.`,
    () => `Is ${playerName} already better than most Premier League wingers? ${assists} assists at ${ovr} OVR. The boy is SPECIAL.`,
    () => `The debate is OVER. ${playerName} at ${ovr} OVR with 81 potential. He is going to be the BEST Welsh player EVER.`,
    () => `${playerName} just broke Spezia season assists record! ${seasonAssists} assists -- previous record was 6. Let that SINK IN.`,
    () => `Avg rating of ${avgRating} in debut season. ${playerName} is not just good -- he is GENERATIONAL.`,
    () => `I am just here to watch ${playerName} cook. Every single game. This is appointment viewing.`,
    () => `Serie A defenders have NO ANSWER for ${playerName}. ${seasonGoals} goals, ${seasonAssists} assists in one season. FUTURE BALLON D OR.`,
  ];

  // Anti-Ampadu / counter-argument posts
  const antiPosts = [
    () => `Relax everyone. It is ONE season at SPEZIA. Let us see if he can do it at a big club first before calling him world class.`,
    () => `${playerName} is overrated. 4 goals is nothing special. Plenty of youngsters score more. The hype is too much.`,
    () => `People comparing ${playerName} to legends are embarrassing themselves. He plays for SPEZIA in SERIE A. The level is not that high.`,
    () => `16 assists sounds great until you realize half of them are simple passes. He is not creating anything special.`,
    () => `${playerName} will never make it at the top level. He is a good Serie A player but that is his ceiling.`,
    () => `The stats are inflated because Spezia play open football. Put him in a defensive system and he disappears.`,
    () => `Every season there is a new hyped youngster. Remember when people thought Jadon Sancho was the next Messi? ${playerName} is the same.`,
    () => `I like ${playerName} but the comparisons to Henry and Rooney are ridiculous. He has 4 GOALS. FOUR.`,
  ];

  // Supportive fan reactions
  const fanReactions = [
    () => `The disrespect in this thread is unreal. ${playerName} is 14 years old and doing THIS. You lot are crazy.`,
    () => `People said the same about Messi at Barcelona. "He is just a small club player." Look how that turned out.`,
    () => `${playerName} does not need your validation. The kid is special and the whole world knows it.`,
    () => `Found the guy who does not actually watch football. ${playerName} passes the eye test AND the stat test.`,
    () => `This is why football fans are the worst. A 14-year-old is breaking records and you are crying about it.`,
  ];

  const pickPro = () => proPosts[seededRandom(String(id)) % proPosts.length]();
  const pickAnti = () => antiPosts[seededRandom(String(id)) % antiPosts.length]();
  const pickFan = () => fanReactions[seededRandom(String(id)) % fanReactions.length]();

  // Alternate between pro, anti, and fan reaction
  for (let i = 0; i < 12; i++) {
    const acct = accounts[i % accounts.length];
    const isAnti = i % 3 === 1;
    const isFanReaction = i % 3 === 2;

    let content: string;
    if (isAnti) {
      content = pickAnti();
    } else if (isFanReaction) {
      content = pickFan();
    } else {
      content = pickPro();
    }

    posts.push({
      id: String(id++),
      author: acct.name,
      handle: acct.handle,
      flag: acct.flag,
      verified: acct.verified,
      content,
      likes: seededRandom(String(id)) % 5000 + 200,
      replies: seededRandom(String(id)) % 200 + 30,
      timeAgo: `${i + 1}h`,
    });
  }

  return posts;
}

const formatNumber = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

const DMCard: React.FC<{ dm: DirectMessage; onClick: () => void }> = ({ dm, onClick }) => {
  const roleColors: Record<string, string> = {
    legend: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    agent: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    coach: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-zinc-900/80 border rounded-2xl p-4 hover:border-zinc-700 transition-all ${!dm.read ? 'border-blue-500/30' : 'border-zinc-800'}`}
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-lg">{dm.flag}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{dm.sender}</span>
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${roleColors[dm.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{dm.role}</span>
            {!dm.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{dm.content}</p>
          <p className="text-[10px] text-zinc-600 mt-1">{dm.timeAgo}</p>
        </div>
      </div>
    </button>
  );
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timeAgo: string;
}

const DMDetail: React.FC<{ dm: DirectMessage; onClose: () => void }> = ({ dm, onClose }) => {
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const roleColors: Record<string, string> = {
    legend: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    agent: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    coach: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  const handleSend = async () => {
    if (!reply.trim() || loading) return;
    const userMessage = reply.trim();
    setReply('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timeAgo: 'Just now' }]);
    setLoading(true);

    try {
      const data = careerExportData as any;
      const profile = data.my_player_profile || {};
      const seasons = data.seasons || [];
      const avgRating = seasons.length > 0
        ? (seasons.reduce((s: number, x: any) => s + (parseFloat(x.avgRating) || 0), 0) / seasons.length).toFixed(1)
        : '0.0';

      const response = await generateDMReply(
        dm.sender,
        dm.role,
        dm.content,
        userMessage,
        {
          name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Ethan Ampadu',
          ovr: parseInt(profile.overallrating || '65'),
          goals: data.total_goals || 0,
          assists: data.total_assists || 0,
          avgRating,
          motm: seasons.reduce((s: number, x: any) => s + (x.motm || 0), 0),
          club: profile.currentClub || 'Spezia',
          age: seasons.length > 0 ? (seasons[0].age || 14) : 14,
        },
        messages
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response, timeAgo: 'Just now' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Thank you for your message. Keep working hard.', timeAgo: 'Just now' }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">{dm.flag}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{dm.sender}</span>
                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${roleColors[dm.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{dm.role}</span>
                </div>
                <span className="text-xs text-zinc-500">{dm.handle}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm px-2 py-1">X</button>
          </div>
        </div>

        <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
          {/* Original DM */}
          <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white">{dm.sender}</span>
              <span className="text-[10px] text-zinc-600">{dm.timeAgo}</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{dm.content}</p>
          </div>

          {/* Chat history */}
          {messages.map((msg, idx) => (
            <div key={idx} className={`rounded-2xl p-4 ${msg.role === 'user' ? 'bg-amber-500/10 border border-amber-500/30 ml-8' : 'bg-zinc-800/50 border border-zinc-700/30 mr-8'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white">{msg.role === 'user' ? 'You' : dm.sender}</span>
                <span className="text-[10px] text-zinc-600">{msg.timeAgo}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{msg.content}</p>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-2xl p-4 mr-8">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-zinc-500">{dm.sender} is typing...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Reply..."
              disabled={loading}
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || loading}
              className="px-3 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SocialMediaView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'dms'>('feed');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);

  const posts = useMemo(() => {
    const data = careerExportData as any;
    return generatePosts(data);
  }, []);

  const unreadCount = MOCK_DMS.filter(d => !d.read).length;

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">SOCIAL HUB</h2>
          <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-full">LIVE</span>
        </div>
        <p className="text-zinc-400 text-xs mt-1">Fan debates, pundit reactions, and direct messages</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveSubTab('feed')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${activeSubTab === 'feed' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>Feed</button>
        <button onClick={() => setActiveSubTab('dms')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${activeSubTab === 'dms' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
          DMs
          {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{unreadCount}</span>}
        </button>
      </div>

      {activeSubTab === 'feed' && (
        <div className="space-y-3">
          {posts.map(post => {
            const isLiked = likedPosts.has(post.id);
            const likeCount = isLiked ? post.likes + 1 : post.likes;
            return (
              <div key={post.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-all">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-lg">{post.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{post.author}</span>
                      {post.verified && <span className="text-blue-400 text-xs">&#10003;</span>}
                      <span className="text-xs text-zinc-500">{post.handle}</span>
                      <span className="text-xs text-zinc-600">&bull; {post.timeAgo}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mt-1">{post.content}</p>
                    <div className="flex items-center gap-6 mt-3">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${isLiked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-400' : ''}`} /> {formatNumber(likeCount)}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" /> {formatNumber(post.replies)}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-green-400 transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSubTab === 'dms' && (
        <div className="space-y-3">
          {MOCK_DMS.map(dm => <DMCard key={dm.id} dm={dm} onClick={() => setSelectedDM(dm)} />)}
        </div>
      )}

      {selectedDM && (
        <DMDetail dm={selectedDM} onClose={() => setSelectedDM(null)} />
      )}
    </div>
  );
};
