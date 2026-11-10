import TeamInfoCard from '../../components/team-info-card/team-info-card';
import { mockTeam } from '../../components/team-info-card/mock-team';

export default function DashboardPage() {
  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      minHeight: 'var(--page-height)',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      fontFamily: 'var(--font-family-primary)',
      background: 'var(--color-primary-dark-background)'
    }}>
      <div style={{ flex: 1, maxWidth: '720px', padding: '40px', boxSizing: 'border-box' }}>
        <TeamInfoCard team={mockTeam} />
      </div>
    </div>
  );
}