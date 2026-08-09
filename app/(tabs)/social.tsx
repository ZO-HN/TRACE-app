import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useFollows } from '../../src/hooks/useFollows';
import { useFollowers } from '../../src/hooks/useFollowers';
import { useCoachRoster, type RosterMember } from '../../src/hooks/useCoachRoster';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';

type SocialTab = 'feed' | 'connected' | 'discover';

const TABS: { key: SocialTab; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'connected', label: 'Connected' },
  { key: 'discover', label: 'Discover' },
];

function NotLiveYet({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-2 py-16">
      <Ionicons name="people-outline" size={28} color="#6B7280" />
      <Text className="text-white font-semibold text-center">{label} isn't live yet</Text>
      <Text className="text-sm text-gray-500 text-center">
        This feature needs a backend update that hasn't been applied yet.
      </Text>
    </View>
  );
}

function FeedTab() {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-2 py-16">
      <Ionicons name="barbell-outline" size={28} color="#6B7280" />
      <Text className="text-white font-semibold">No workouts yet</Text>
      <Text className="text-sm text-gray-500 text-center">
        When people you follow share their workouts, they'll appear here.
      </Text>
    </View>
  );
}

function RosterRow({
  member,
  action,
}: {
  member: RosterMember;
  action: React.ReactNode;
}) {
  return (
    <Card className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 items-center justify-center">
          <Text className="text-primary text-xs font-bold">
            {member.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text className="text-white font-medium">{member.displayName}</Text>
      </View>
      {action}
    </Card>
  );
}

function ConnectedTab({ userId }: { userId: string }) {
  const { roster, isAvailable: rosterAvailable } = useCoachRoster();
  const { followeeIds, isAvailable: followsAvailable, unfollow } = useFollows(userId);
  const { followerIds } = useFollowers(userId);

  if (!rosterAvailable || !followsAvailable) return <NotLiveYet label="Connections" />;

  const following = roster.filter((m) => followeeIds.includes(m.id));
  const followers = roster.filter((m) => followerIds.includes(m.id));

  return (
    <ScrollView contentContainerClassName="p-4 gap-6">
      <View className="gap-2">
        <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
          Following ({following.length})
        </Text>
        {following.length === 0 ? (
          <Text className="text-sm text-gray-500">Not following anyone yet.</Text>
        ) : (
          following.map((m) => (
            <RosterRow
              key={m.id}
              member={m}
              action={
                <Pressable onPress={() => void unfollow(m.id)}>
                  <Text className="text-gray-400 text-xs font-semibold">Unfollow</Text>
                </Pressable>
              }
            />
          ))
        )}
      </View>

      <View className="gap-2">
        <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
          Followers ({followers.length})
        </Text>
        {followers.length === 0 ? (
          <Text className="text-sm text-gray-500">No followers yet.</Text>
        ) : (
          followers.map((m) => <RosterRow key={m.id} member={m} action={null} />)
        )}
      </View>
    </ScrollView>
  );
}

function DiscoverTab({ userId }: { userId: string }) {
  const { roster, isLoading, isAvailable: rosterAvailable } = useCoachRoster();
  const { followeeIds, isAvailable: followsAvailable, follow, unfollow } = useFollows(userId);

  if (!rosterAvailable || !followsAvailable) return <NotLiveYet label="Discover" />;

  if (!isLoading && roster.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6 gap-2 py-16">
        <Ionicons name="people-outline" size={28} color="#6B7280" />
        <Text className="text-white font-semibold">No one else here yet</Text>
        <Text className="text-sm text-gray-500 text-center">
          Other trainees your coach adds will show up here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerClassName="p-4 gap-2">
      {roster.map((m) => {
        const isFollowing = followeeIds.includes(m.id);
        return (
          <RosterRow
            key={m.id}
            member={m}
            action={
              <Button
                size="sm"
                variant={isFollowing ? 'secondary' : 'primary'}
                onPress={() => void (isFollowing ? unfollow(m.id) : follow(m.id))}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            }
          />
        );
      })}
    </ScrollView>
  );
}

export default function SocialTab() {
  const { profile } = useTraceUserContext();
  const [tab, setTab] = useState<SocialTab>('feed');

  return (
    <View className="flex-1">
      <View className="flex-row border-b border-border">
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`flex-1 py-3 items-center border-b-2 ${tab === t.key ? 'border-primary' : 'border-transparent'}`}
          >
            <Text className={`text-sm font-semibold ${tab === t.key ? 'text-white' : 'text-gray-500'}`}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'feed' && <FeedTab />}
      {tab === 'connected' && <ConnectedTab userId={profile!.id} />}
      {tab === 'discover' && <DiscoverTab userId={profile!.id} />}
    </View>
  );
}
