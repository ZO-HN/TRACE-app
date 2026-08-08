import { useTraceUserContext } from '../../src/context/TraceUserContext';
import Dashboard from '../../src/components/Dashboard';

export default function DashboardTab() {
  const { profile } = useTraceUserContext();
  return <Dashboard userId={profile!.id} />;
}
