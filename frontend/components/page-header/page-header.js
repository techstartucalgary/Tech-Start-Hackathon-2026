export default function PageHeader({ title }) {
  return (
    <header
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: '24px var(--header-padding-x)',
        borderBottom: '1px solid var(--color-white-soft)',
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: 'var(--font-weight-medium)' }}>
        {title}
      </h1>
    </header>
  );
}