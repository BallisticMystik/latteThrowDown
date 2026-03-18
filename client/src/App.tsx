import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import ContestsPage from './pages/ContestsPage';
import CreatePage from './pages/CreatePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import WelcomePage from './pages/WelcomePage';
import ThrowdownPage from './pages/ThrowdownPage';
import CreateContentPage from './pages/CreateContentPage';
import ContentFeedPage from './pages/ContentFeedPage';
import LiveStreamPage from './pages/LiveStreamPage';
import LiveBrowsePage from './pages/LiveBrowsePage';
import PostDetailPage from './pages/PostDetailPage';
import GoLivePage from './pages/GoLivePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<ContentFeedPage />} />
          <Route path="/content/new" element={<CreateContentPage />} />
          <Route path="/content/post/:id" element={<PostDetailPage />} />
          <Route path="/content/live" element={<LiveBrowsePage />} />
          <Route path="/content/live/:id" element={<LiveStreamPage />} />
          <Route path="/content/go-live" element={<GoLivePage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/throwdown" element={<ThrowdownPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
