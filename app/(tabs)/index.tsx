import { useTraceUserContext } from '../../src/context/TraceUserContext';
import GymLogger from '../../src/components/GymLogger';

export default function LogTab() {
  const { profile } = useTraceUserContext();
  return <GymLogger userId={profile!.id} />;
}
