import LoginRegisterCard from '../../components/welcome-page/login-register-card';
import ParticleBackground from '../../components/welcome-page/particle-background';

export default function WelcomePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100vw',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'auto',
      fontFamily: 'var(--font-family-primary)',
      background: 'var(--color-primary-dark-background)',
      position: 'relative'
    }}>
      <ParticleBackground />

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '12.5% 100%, 100% 33.33%',
        opacity: 0.18,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        flex: '1 1 50%',
        minWidth: '320px',
        height: '100%',
        minHeight: '100vh',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: 'var(--color-white)',
        boxSizing: 'border-box',
        padding: 'clamp(32px, 5vw, 56px) clamp(24px, 4vw, 58px)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '100%',
          maxWidth: '620px'
        }}>
          <h1 className="display-heading">
            Cursor X Tech Start
            Hackathon 2026
          </h1>

          <p className="subheading-text" style={{ marginTop: '34px', maxWidth: '620px', opacity: 0.9 }}>
            Join hundreds of builders for a two-day sprint at the University of
            Calgary. Form a team, ship an idea, and present what’s next.
          </p>

          <div style={{
            display: 'flex',
            gap: '46px',
            marginTop: '42px',
            alignItems: 'flex-end'
          }}>
            <div>
              <div className="section-heading">
                2 days
              </div>
              <div className="meta-label" style={{ marginTop: '8px' }}>
                Build sprint
              </div>
            </div>

            <div>
              <div className="section-heading">
                $500
              </div>
              <div className="meta-label" style={{ marginTop: '8px' }}>
                Prize pool
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        flex: '1 1 50%',
        minWidth: '320px',
        minHeight: '100vh',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: 'clamp(24px, 4vw, 48px)',
        position: 'relative',
        zIndex: 1
      }}>
        <LoginRegisterCard />
      </div>
    </div>
  );
}
