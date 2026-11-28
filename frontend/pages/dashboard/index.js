import TeamInfoCard from '../../components/team-info-card/team-info-card';
import { mockTeam } from '../../components/team-info-card/mock-team';
import ScheduleCard from '../../components/schedule-card/schedule-card';
import { mockSchedule } from '../../components/schedule-card/mock-schedule';

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
      <div
        style={{
          flex: 1,
          maxWidth: '720px',
          padding: '40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <TeamInfoCard team={mockTeam} />
        <ScheduleCard timeZone={mockSchedule.timeZone} events={mockSchedule.events} />
      </div>
    </div>
  );
}