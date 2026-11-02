import LoginCard from '../../components/login-card/login-card';

export default function RegisterPage() {
  return (
    <main className="registration-page">
      <div className="registration-shell">
        <header className="introduction">
          <h1>Create your account.</h1>
          <p>
            Join Tech Start with email and password, or continue with Google to
            speed up your first sign-in.
          </p>
        </header>
        <LoginCard registration />
      </div>

      <style jsx>{`
        .registration-page {
          box-sizing: border-box;
          min-height: 100vh;
          padding: 56px 72px;
          background: var(--color-dark-section-gradient-start);
        }

        .registration-shell {
          display: grid;
          grid-template-columns: 322px minmax(0, 1fr);
          align-items: start;
          gap: 48px;
          max-width: 1296px;
          margin: 0 auto;
        }

        .introduction {
          display: grid;
          gap: 12px;
          max-width: 322px;
        }

        h1 {
          font-size: 34px;
          font-weight: 800;
          line-height: 1.12;
        }

        p {
          font-size: 14px;
          line-height: 1.6;
          color: #a9b3b3;
        }

        @media (max-width: 960px) {
          .registration-page {
            padding: 32px 24px;
          }

          .registration-shell {
            grid-template-columns: minmax(0, 1fr);
            gap: 32px;
          }
        }
      `}</style>
    </main>
  );
}
