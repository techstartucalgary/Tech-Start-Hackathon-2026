import { useId } from 'react';
import Link from 'next/link';

// Design: https://www.figma.com/design/NsAFWkz6tAjDKgAce2XTQL/Tech-Start-Hackathon-2026?node-id=3-17798
export default function LoginCard() {
  const id = useId();

  return (
    <section className="login-card" aria-labelledby={`${id}-title`}>
      <div className="heading">
        <h2 id={`${id}-title`}>Welcome back</h2>
        <p className="instructions">
          Continue with Google or sign in with your email and password.
        </p>
      </div>

      {/* SCRUM-8 is display-only; authentication is handled in later tickets. */}
      <button className="google-button" type="button" disabled>
        {/* Official asset: https://developers.google.com/identity/branding-guidelines */}
        <img src="/images/google-g.png" width="18" height="18" alt="" />
        Continue with Google
      </button>

      <div className="divider">OR</div>

      <div className="fields">
        <div className="field">
          <label htmlFor={`${id}-email`}>Email address</label>
          <input
            id={`${id}-email`}
            type="email"
            placeholder="name@domain.com"
            autoComplete="off"
            readOnly
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-password`}>Password</label>
          <input
            id={`${id}-password`}
            type="password"
            placeholder="••••••••"
            autoComplete="off"
            readOnly
          />
        </div>
      </div>

      <button className="email-button" type="button" disabled>
        Sign in with email and password
      </button>

      <p className="register-prompt">
        Don’t have an account? <Link href="/register">Register</Link>
      </p>

      <style jsx>{`
        .login-card {
          box-sizing: border-box;
          display: grid;
          gap: 22px;
          width: 100%;
          max-width: 456px;
          padding: 34px;
          border-radius: 24px;
          background: #1a1a1a;
          box-shadow:
            inset 0 0 0 1px #2b3033,
            0 12px 32px var(--color-shadow);
        }

        .heading {
          display: grid;
          gap: 8px;
        }

        h2 {
          font-size: 28px;
          font-weight: 800;
          line-height: 34px;
        }

        .instructions {
          font-size: 14px;
          line-height: 21px;
          color: #a9b3b3;
        }

        button {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 46px;
          padding: 10px 18px;
          border: 0;
          border-radius: 12px;
          font-size: 14px;
          font-weight: var(--font-weight-bold);
          line-height: 17px;
          color: var(--color-primary-dark-background);
          box-shadow: 0 8px 28px rgba(77, 214, 168, 0.18);
          opacity: 1;
          cursor: default;
        }

        .google-button {
          background: var(--color-white);
        }

        .google-button img {
          flex-shrink: 0;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          line-height: 13px;
          color: #a9b3b3;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #2b3033;
        }

        .fields {
          display: grid;
          gap: 22px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        label {
          font-size: 13px;
          line-height: 16px;
          color: #d3dada;
        }

        input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: 46px;
          padding: 0 14px;
          border: 1px solid #2b3033;
          border-radius: 12px;
          background: var(--color-deep-black);
          font-size: 14px;
          line-height: 17px;
        }

        input::placeholder {
          color: #a9b3b3;
          opacity: 1;
        }

        .email-button {
          background: var(--color-primary-green);
        }

        .register-prompt {
          text-align: center;
          font-size: 13px;
          line-height: 16px;
          color: #a9b3b3;
        }

        .register-prompt :global(a) {
          color: var(--color-primary-green);
          font-weight: var(--font-weight-bold);
          text-decoration: none;
        }

        .register-prompt :global(a:hover) {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 24px;
          }
        }

        input:focus-visible,
        .register-prompt :global(a:focus-visible) {
          outline: 2px solid var(--color-primary-green);
          outline-offset: 4px;
        }
      `}</style>
    </section>
  );
}
