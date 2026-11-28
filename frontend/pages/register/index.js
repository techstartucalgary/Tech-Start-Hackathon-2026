import RegistrationCard from '../../components/registration-card/registration-card';
import ParticleBackground from '../../components/animations/particle-background';

export default function RegisterPage() {
  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      minHeight: 'var(--page-height)',
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
        padding: 'clamp(24px, 4vw, 48px)',
        boxSizing: 'border-box'
      }}>
        <RegistrationCard />
      </div>
    </div>
  );
}
