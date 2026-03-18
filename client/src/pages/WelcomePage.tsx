import { Link } from 'react-router-dom';
import { Coffee, Trophy, Users, Star, ArrowRight, Zap, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Trophy,
    title: 'Compete',
    description: 'Enter latte art contests and prove your craft against the best.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Vote on entries, follow baristas, and build your network.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Rank Up',
    description: 'Climb the leaderboard and earn badges for your achievements.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Zap,
    title: 'Get Noticed',
    description: 'Build a portable reputation that opens doors to new opportunities.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg text-center flex flex-col items-center gap-8 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Coffee className="h-10 w-10 text-primary" strokeWidth={1.5} />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
            >
              <Star className="h-3.5 w-3.5 text-warning-content" fill="currentColor" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              Barista <span className="text-primary">Spotlight</span>
            </h1>
            <p className="text-base-content/60 text-lg mt-4 leading-relaxed max-w-md mx-auto">
              The competition platform where baristas build reputations, one pour at a time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            <a href="/auth/google" className="btn btn-primary btn-lg gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/" className="btn btn-ghost btn-lg border border-base-300">
              Explore
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto max-w-3xl px-4 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
              }}
              whileHover={{ y: -2 }}
              className="card bg-base-200 border border-base-300"
            >
              <div className="card-body p-5 gap-3">
                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="text-sm text-base-content/50">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="flex justify-center gap-8 text-base-content/40">
            <div>
              <p className="text-2xl font-bold text-base-content">1.2k+</p>
              <p className="text-xs">Baristas</p>
            </div>
            <div className="w-px bg-base-300" />
            <div>
              <p className="text-2xl font-bold text-base-content">3.4k+</p>
              <p className="text-xs">Submissions</p>
            </div>
            <div className="w-px bg-base-300" />
            <div>
              <p className="text-2xl font-bold text-base-content">50+</p>
              <p className="text-xs">Contests</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
