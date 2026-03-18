import { useState } from 'react';
import { Users, Trophy } from 'lucide-react';

export interface ProfileCardData {
  id: string;
  name: string;
  image: string;
  bio: string;
  location?: string;
  followers: string;
  wins?: number;
  isFollowing?: boolean;
}

interface ProfileCardProps {
  profile: ProfileCardData;
  onFollow?: (id: string) => void;
}

export function ProfileCard({ profile, onFollow }: ProfileCardProps) {
  const [following, setFollowing] = useState(profile.isFollowing ?? false);

  const handleFollow = () => {
    setFollowing(!following);
    onFollow?.(profile.id);
  };

  return (
    <div className="profile-card" tabIndex={0}>
      <img src={profile.image} alt={profile.name} />
      <section>
        <h2>{profile.name}</h2>
        <p>{profile.bio}</p>
        <div className="profile-card-actions">
          <div className="profile-card-tag">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {profile.followers}
              </span>
              {profile.wins !== undefined && (
                <span className="flex items-center gap-1 text-primary">
                  <Trophy className="h-3.5 w-3.5" /> {profile.wins}
                </span>
              )}
            </div>
          </div>
          <button
            className={`touch-target touch-manipulation min-h-[44px] px-4 py-2.5 ${following ? 'following' : ''}`}
            onClick={handleFollow}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      </section>
    </div>
  );
}
