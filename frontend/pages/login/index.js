import LoginCard from '../../components/login-card/login-card';
import ParticleBackground from '../../components/animations/particle-background';

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      fontFamily: 'var(--font-family-primary)',
      background: 'var(--color-primary-dark-background)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      isolation: 'isolate'
    }}>
      <ParticleBackground />

      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 'clamp(24px, 4vw, 48px)',
        boxSizing: 'border-box'
      }}>
        <LoginCard />
      </div>
    </div>
  );
}
