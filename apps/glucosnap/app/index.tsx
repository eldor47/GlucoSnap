import { Redirect } from 'expo-router';
import { useSession } from '../src/state/session';

export default function Index() {
  const { session, loading } = useSession();
  if (loading) return null;
  return <Redirect href={session ? '/home' : '/login'} />;
}
