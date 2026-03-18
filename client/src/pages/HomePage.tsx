import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Users, Clock, ArrowRight, Flame, Star, Eye, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedCard, StaggerContainer, StaggerItem } from '../components/AnimatedCard';
import { ProfileCard, type ProfileCardData } from '../components/ProfileCard';

const featuredContest = {
  id: '1',
  title: 'Spring Latte Art Open',
  description: 'Show off your best latte art pour in our flagship seasonal competition.',
  entries: 47,
  daysLeft: 3,
  prize: '$500 + Feature',
  image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&q=80',
};

const trendingBaristas: ProfileCardData[] = [
  {
    id: '1', name: 'Maya Chen',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    bio: 'Rosetta queen. 12x champion. Portland\u2019s finest pour.',
    location: 'Portland, OR', followers: '2.8k', wins: 12,
  },
  {
    id: '2', name: 'Alex Rivera',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    bio: 'Freestyle specialist. Always pushing boundaries in the cup.',
    location: 'Seattle, WA', followers: '2.1k', wins: 9,
  },
  {
    id: '3', name: 'Sam Okafor',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
    bio: 'Speed pour legend. Consistent tulips under pressure.',
    location: 'Brooklyn, NY', followers: '1.9k', wins: 8,
  },
  {
    id: '4', name: 'Lina Tanaka',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    bio: 'Precision meets creativity. Rising fast on the board.',
    location: 'San Francisco, CA', followers: '1.5k', wins: 7,
  },
];

const recentActivity = [
  { id: '1', type: 'result', text: 'Maya Chen won the Regional Rosetta Championship', time: '2h ago' },
  { id: '2', type: 'contest', text: 'New contest: Evening Pour Throwdown', time: '5h ago' },
  { id: '3', type: 'milestone', text: 'Platform hit 1,000 submissions this month!', time: '1d ago' },
  { id: '4', type: 'result', text: 'Spring Latte Art Open judging begins tomorrow', time: '1d ago' },
];

const stats = [
  { label: 'Active Contests', value: '8', icon: Trophy, color: 'text-primary' },
  { label: 'Baristas', value: '1.2k', icon: Users, color: 'text-secondary' },
  { label: 'Submissions', value: '3.4k', icon: TrendingUp, color: 'text-accent' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Quick stats */}
      <StaggerContainer className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <StaggerItem key={stat.label}>
            <div className="card bg-base-200 border border-base-300">
              <div className="card-body p-4 items-center text-center gap-1">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-base-content/50">{stat.label}</span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Throwdown CTA */}
      <AnimatedCard className="border-warning/30 bg-gradient-to-r from-warning/10 via-base-200 to-primary/10 overflow-hidden" delay={0.15} hover={true}>
        <div className="card-body p-4 flex-row items-center gap-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center shrink-0"
          >
            <Zap className="h-6 w-6 text-warning" />
          </motion.div>
          <div className="flex-1">
            <h3 className="font-bold">Latte Art Throwdown</h3>
            <p className="text-xs text-base-content/50 mt-0.5">Spin the carousel, get a design, recreate it. Prove your pour.</p>
          </div>
          <Link to="/throwdown" className="btn btn-warning btn-sm gap-1 shrink-0">
            Go <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </AnimatedCard>

      {/* Featured contest */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-error" />
            Featured Contest
          </h2>
          <Link to="/contests" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <AnimatedCard className="overflow-hidden" delay={0.1}>
          <figure className="relative h-48 overflow-hidden">
            <img
              src={featuredContest.image}
              alt={featuredContest.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-100/90 via-base-100/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="badge badge-primary badge-sm mb-2">
                <Clock className="h-3 w-3 mr-1" />
                {featuredContest.daysLeft} days left
              </div>
              <h3 className="text-xl font-bold">{featuredContest.title}</h3>
            </div>
          </figure>
          <div className="card-body p-4 pt-3">
            <p className="text-sm text-base-content/60">{featuredContest.description}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-4 text-sm text-base-content/50">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {featuredContest.entries} entries
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> {featuredContest.prize}
                </span>
              </div>
              <Link to="/contests" className="btn btn-primary btn-sm">
                Enter Now
              </Link>
            </div>
          </div>
        </AnimatedCard>
      </section>

      {/* Trending baristas — profile cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Baristas
          </h2>
          <Link to="/leaderboard" className="text-sm text-primary hover:underline flex items-center gap-1">
            Full board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
        >
          {trendingBaristas.map((barista, i) => (
            <motion.div
              key={barista.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
              className="snap-start"
            >
              <ProfileCard profile={barista} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <StaggerContainer className="flex flex-col gap-2">
          {recentActivity.map((activity) => (
            <StaggerItem key={activity.id}>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300/50">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  activity.type === 'result' ? 'bg-success' :
                  activity.type === 'contest' ? 'bg-primary' :
                  'bg-warning'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.text}</p>
                  <p className="text-xs text-base-content/40 mt-0.5">{activity.time}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </div>
  );
}
