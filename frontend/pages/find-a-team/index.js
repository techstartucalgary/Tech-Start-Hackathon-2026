import PageHeader from '../../components/page-header/page-header';

export default function FindATeamPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      minHeight: 'var(--page-height)',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      fontFamily: 'var(--font-family-primary)',
      background: 'var(--color-primary-dark-background)'
    }}>
      <PageHeader title="Find a Team" />
    </div>
  );
}