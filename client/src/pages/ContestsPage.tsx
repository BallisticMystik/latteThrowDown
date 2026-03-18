import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Users, Star, MapPin, Filter, ChevronRight } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../components/AnimatedCard';

type Tab = 'all' | 'open' | 'judging' | 'completed';

const tabs: { key: Tab; label: string; count: number }[] = [
  { key: 'all', label: 'All', count: 12 },
  { key: 'open', label: 'Open', count: 5 },
  { key: 'judging', label: 'Judging', count: 3 },
  { key: 'completed', label: 'Completed', count: 4 },
];

const contests = [
  {
    id: '1', title: 'Spring Latte Art Open', status: 'open' as const,
    category: 'Latte Art', region: 'Global', entries: 47, maxEntries: 64,
    daysLeft: 3, prize: '$500 + Feature', featured: true,
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
  },
  {
    id: '2', title: 'PNW Rosetta Championship', status: 'open' as const,
    category: 'Rosetta', region: 'Pacific NW', entries: 28, maxEntries: 32,
    daysLeft: 7, prize: '$300', featured: false,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  },
  {
    id: '3', title: 'Speed Pour Challenge', status: 'judging' as const,
    category: 'Speed Pour', region: 'Global', entries: 64, maxEntries: 64,
    daysLeft: 0, prize: '$250 + Badge', featured: false,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
  },
  {
    id: '4', title: 'Winter Throwdown Finals', status: 'completed' as const,
    category: 'Latte Art', region: 'National', entries: 128, maxEntries: 128,
    daysLeft: 0, prize: '$1,000', featured: false,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
  },
  {
    id: '5', title: 'Freestyle Pour Invitational', status: 'open' as const,
    category: 'Freestyle', region: 'West Coast', entries: 15, maxEntries: 32,
    daysLeft: 12, prize: '$400 + Trophy', featured: false,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
  },
  {
    id: '6', title: 'Beginner Bracket Showdown', status: 'judging' as const,
    category: 'Beginner', region: 'Global', entries: 48, maxEntries: 48,
    daysLeft: 0, prize: 'Badge + Feature', featured: false,
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80',
  },
];

const statusColors = {
  open: 'badge-success',
  judging: 'badge-warning',
  completed: 'badge-ghost',
};

const statusLabels = {
  open: 'Open',
  judging: 'Judging',
  completed: 'Completed',
};

export default function ContestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const filtered = activeTab === 'all' ? contests : contests.filter(c => c.status === activeTab);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contests</h1>
          <p className="text-sm text-base-content/50 mt-1">Find your next competition</p>
        </div>
        <button className="btn btn-ghost btn-sm gap-2">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="contest-tab"
                className="absolute inset-0 bg-primary/15 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            <span className="relative z-10 ml-1.5 text-xs opacity-50">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Contest cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <StaggerContainer className="flex flex-col gap-4">
            {filtered.map((contest) => (
              <StaggerItem key={contest.id}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                  className="card bg-base-200 border border-base-300 overflow-hidden cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="sm:w-40 h-32 sm:h-auto overflow-hidden">
                      <img
                        src={contest.image}
                        alt={contest.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge badge-sm ${statusColors[contest.status]}`}>
                              {statusLabels[contest.status]}
                            </span>
                            {contest.featured && (
                              <span className="badge badge-sm badge-primary badge-outline">
                                <Star className="h-3 w-3 mr-0.5" /> Featured
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base">{contest.title}</h3>
                        </div>
                        <ChevronRight className="h-5 w-5 text-base-content/30 group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-base-content/50">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5" /> {contest.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {contest.region}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {contest.entries}/{contest.maxEntries}
                        </span>
                        {contest.status === 'open' && (
                          <span className="flex items-center gap-1 text-warning">
                            <Clock className="h-3.5 w-3.5" /> {contest.daysLeft}d left
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-medium text-primary">{contest.prize}</span>
                        {contest.status === 'open' && (
                          <div className="w-24">
                            <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(contest.entries / contest.maxEntries) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
