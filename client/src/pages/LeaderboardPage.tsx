import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy, MapPin } from 'lucide-react';
import { ProfileCard, type ProfileCardData } from '../components/ProfileCard';
import { StaggerContainer, StaggerItem } from '../components/AnimatedCard';

type Category = 'overall' | 'latte_art' | 'creativity' | 'consistency';

const categories: { key: Category; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'latte_art', label: 'Latte Art' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'consistency', label: 'Consistency' },
];

const top3Cards: ProfileCardData[] = [
  {
    id: '1', name: 'Maya Chen',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    bio: 'Rosetta queen. 12x champion. Portland\u2019s finest pour artist.',
    followers: '2.8k', wins: 12,
  },
  {
    id: '2', name: 'Alex Rivera',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    bio: 'Freestyle specialist pushing boundaries one cup at a time.',
    followers: '2.1k', wins: 9,
  },
  {
    id: '3', name: 'Sam Okafor',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
    bio: 'Speed pour legend. Consistent tulips under any pressure.',
    followers: '1.9k', wins: 8,
  },
];

const leaderboard = [
  { rank: 4, name: 'Lina Tanaka', score: 2445, location: 'San Francisco, CA', wins: 7, contests: 14, trend: 'up' as const, change: 5 },
  { rank: 5, name: 'Jordan Silva', score: 2398, location: 'Austin, TX', wins: 6, contests: 12, trend: 'same' as const, change: 0 },
  { rank: 6, name: 'Priya Patel', score: 2310, location: 'Chicago, IL', wins: 5, contests: 16, trend: 'down' as const, change: 1 },
  { rank: 7, name: 'Kai Nguyen', score: 2267, location: 'Denver, CO', wins: 5, contests: 11, trend: 'up' as const, change: 4 },
  { rank: 8, name: 'Emma Larsson', score: 2190, location: 'Minneapolis, MN', wins: 4, contests: 13, trend: 'up' as const, change: 2 },
  { rank: 9, name: 'Diego Morales', score: 2145, location: 'Miami, FL', wins: 4, contests: 10, trend: 'down' as const, change: 3 },
  { rank: 10, name: 'Zoe Williams', score: 2098, location: 'Nashville, TN', wins: 3, contests: 9, trend: 'same' as const, change: 0 },
];

const trendIcon = {
  up: <TrendingUp className="h-3.5 w-3.5 text-success" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-error" />,
  same: <Minus className="h-3.5 w-3.5 text-base-content/30" />,
};

const rankLabels = ['1st', '2nd', '3rd'];

export default function LeaderboardPage() {
  const [category, setCategory] = useState<Category>('overall');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-sm text-base-content/50 mt-1">Top baristas by ranking score</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat.key
                ? 'text-primary'
                : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            {category === cat.key && (
              <motion.div
                layoutId="leaderboard-tab"
                className="absolute inset-0 bg-primary/15 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Top 3 — profile cards */}
      <section>
        <h2 className="text-sm font-medium text-base-content/50 mb-3">Top Baristas</h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory justify-center"
        >
          {top3Cards.map((barista, i) => (
            <motion.div
              key={barista.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="snap-start relative"
            >
              <div className={`absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-warning text-warning-content' :
                i === 1 ? 'bg-base-300 text-base-content' :
                'bg-accent text-accent-content'
              }`}>
                {rankLabels[i]}
              </div>
              <ProfileCard profile={barista} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Rest of rankings */}
      <section>
        <h2 className="text-sm font-medium text-base-content/50 mb-3">Rankings</h2>
        <StaggerContainer className="flex flex-col gap-2">
          {leaderboard.map((barista) => (
            <StaggerItem key={barista.rank}>
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-base-200 border border-base-300 cursor-pointer"
              >
                <span className="w-8 text-center font-bold text-base-content/40 text-sm">
                  {barista.rank}
                </span>
                <div className="avatar placeholder">
                  <div className="bg-base-300 text-base-content rounded-full w-10 h-10">
                    <span className="text-sm font-bold">
                      {barista.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{barista.name}</p>
                  <p className="text-xs text-base-content/50 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {barista.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {trendIcon[barista.trend]}
                    {barista.change > 0 && (
                      <span className={`text-xs ${barista.trend === 'up' ? 'text-success' : 'text-error'}`}>
                        {barista.change}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{barista.score.toLocaleString()}</p>
                    <p className="text-xs text-base-content/50 flex items-center gap-0.5 justify-end">
                      <Trophy className="h-3 w-3" /> {barista.wins}
                    </p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </div>
  );
}
