import { motion } from 'framer-motion';
import { Trophy, Star, Target, TrendingUp, Coffee, Calendar, Edit3, Award, Flame } from 'lucide-react';
import { ProfileCard } from '../components/ProfileCard';
import { StaggerContainer, StaggerItem } from '../components/AnimatedCard';

const myProfile = {
  id: 'me',
  name: 'Jordan Silva',
  image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
  bio: 'Latte art enthusiast. Rosetta specialist. Competing since 2023.',
  location: 'Austin, TX',
  followers: '847',
  wins: 6,
  isFollowing: false,
};

const profileMeta = {
  cafe: 'Third Coast Coffee',
  joinedDate: 'Mar 2024',
  stats: {
    rank: 5,
    score: 2398,
    wins: 6,
    streak: 4,
  },
};

const badges = [
  { name: 'First Pour', icon: Coffee, description: 'Submitted first entry', color: 'text-primary' },
  { name: 'Podium Finish', icon: Trophy, description: 'Top 3 in a contest', color: 'text-warning' },
  { name: 'Rising Star', icon: Star, description: '5+ contest entries', color: 'text-accent' },
  { name: 'Hot Streak', icon: Flame, description: '3 contests in a row', color: 'text-error' },
  { name: 'Sharpshooter', icon: Target, description: '90%+ consistency score', color: 'text-success' },
];

const recentSubmissions = [
  { id: '1', contest: 'Spring Latte Art Open', placement: '\u2014', status: 'pending', date: 'Mar 14' },
  { id: '2', contest: 'PNW Rosetta Championship', placement: '5th', status: 'complete', date: 'Feb 28' },
  { id: '3', contest: 'Speed Pour Challenge', placement: '2nd', status: 'complete', date: 'Feb 10' },
  { id: '4', contest: 'Freestyle Invitational', placement: '8th', status: 'complete', date: 'Jan 20' },
];

const statItems = [
  { label: 'Rank', value: `#${profileMeta.stats.rank}`, icon: TrendingUp, color: 'text-primary' },
  { label: 'Score', value: profileMeta.stats.score.toLocaleString(), icon: Star, color: 'text-warning' },
  { label: 'Wins', value: profileMeta.stats.wins, icon: Trophy, color: 'text-accent' },
  { label: 'Streak', value: `${profileMeta.stats.streak}`, icon: Flame, color: 'text-error' },
];

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Profile card + meta side-by-side on desktop */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="self-center sm:self-start"
        >
          <ProfileCard profile={myProfile} />
        </motion.div>

        {/* Meta + stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 flex flex-col gap-4 w-full"
        >
          {/* Info card */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4 gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{myProfile.name}</h2>
                <button className="btn btn-ghost btn-sm gap-1.5">
                  <Edit3 className="h-4 w-4" /> Edit
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/50">
                <span className="badge badge-sm badge-primary badge-outline">Barista</span>
                <span className="flex items-center gap-1">
                  <Coffee className="h-3.5 w-3.5" /> {profileMeta.cafe}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {profileMeta.joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
                className="card bg-base-200 border border-base-300"
              >
                <div className="card-body p-3 items-center text-center gap-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-lg font-bold">{stat.value}</span>
                  <span className="text-xs text-base-content/50">{stat.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Badges */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Award className="h-5 w-5 text-warning" />
          Badges
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200 border border-base-300 min-w-[90px] cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center">
                <badge.icon className={`h-5 w-5 ${badge.color}`} />
              </div>
              <span className="text-xs font-medium text-center leading-tight">{badge.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent submissions */}
      <section>
        <h2 className="text-lg font-bold mb-3">Recent Submissions</h2>
        <StaggerContainer className="flex flex-col gap-2">
          {recentSubmissions.map((sub) => (
            <StaggerItem key={sub.id}>
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-base-200 border border-base-300 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  sub.placement === '\u2014'
                    ? 'bg-primary/15 text-primary'
                    : sub.placement.includes('1') || sub.placement.includes('2') || sub.placement.includes('3')
                    ? 'bg-warning/15 text-warning'
                    : 'bg-base-300 text-base-content/50'
                }`}>
                  {sub.placement}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{sub.contest}</p>
                  <p className="text-xs text-base-content/50">{sub.date}</p>
                </div>
                <span className={`badge badge-sm ${
                  sub.status === 'pending' ? 'badge-primary badge-outline' : 'badge-ghost'
                }`}>
                  {sub.status === 'pending' ? 'In Progress' : 'Complete'}
                </span>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </div>
  );
}
