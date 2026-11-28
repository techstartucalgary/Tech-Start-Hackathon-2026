import TeamInfoCard from '../../components/team-info-card/team-info-card';
import { mockTeam } from '../../components/team-info-card/mock-team';
import SubmissionCard from '../../components/submission-card/submission-card';

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
      {/* Two flex columns (main + side) that wrap into one column on narrow screens */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: '24px',
          width: '100%',
          maxWidth: '1200px',
          padding: '40px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TeamInfoCard team={mockTeam} />
        </div>
        <div
          style={{
            flex: '1 1 340px',
            maxWidth: '480px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <SubmissionCard />
        </div>
      </div>
    </div>
  );
}