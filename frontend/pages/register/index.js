import LoginCard from '../../components/login-card/login-card';

export default function RegisterPage() {
  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-family-primary)',
        background: 'var(--color-primary-dark-background)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 48px)',
      }}
    >
      <LoginCard registration />
    </div>
  );
}
