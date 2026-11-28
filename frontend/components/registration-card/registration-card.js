import { useState } from 'react';
import Link from 'next/link';
import Card from '../card/card';

const mutedColor = 'rgba(255, 255, 255, 0.6)';

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '0.8125rem',
  fontWeight: 'var(--font-weight-medium)',
};

// First and last name share a row and wrap onto two rows on narrow screens.
const nameFieldStyle = { flex: '1 1 220px', minWidth: 0 };

const inputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'var(--color-deep-black)',
  fontSize: '0.875rem',
  outline: 'none',
};

// One labelled input. The green * marks the field as required.
function Field({ id, label, type = 'text', value, onChange, placeholder, autoComplete, style }) {
  return (
    <div style={style}>
      <label htmlFor={id} style={labelStyle}>
        {label}{' '}
        <span aria-hidden="true" style={{ color: 'var(--color-primary-green)' }}>
          *
        </span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        style={inputStyle}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// Registration form. UI only: nothing is sent anywhere yet (auth comes in a later ticket).
export default function RegistrationCard() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault(); // no authentication workflow yet
  }

  return (
    <Card
      style={{
        maxWidth: '800px',
        padding: 'clamp(20px, 4vw, 28px)',
        borderRadius: '30px',
        boxShadow: '0 30px 80px var(--color-shadow)',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 'var(--font-weight-bold)' }}>
        Create your account
      </h1>
      <p style={{ marginTop: '8px', fontSize: '0.8125rem', color: mutedColor }}>
        Use email and password to register, or continue with Google for a faster first sign-in.
      </p>

      {/* Read-only for now: Google sign-in will be wired up with the auth ticket */}
      <button
        type="button"
        aria-disabled="true"
        title="Google sign-in is coming soon"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          maxWidth: '370px',
          marginTop: '20px',
          padding: '12px',
          borderRadius: '10px',
          border: 'none',
          background: 'var(--color-white)',
          color: 'var(--color-primary-dark-background)',
          fontSize: '0.8125rem',
          fontWeight: 'var(--font-weight-bold)',
          boxShadow: '0 0 20px rgba(77, 214, 168, 0.25)',
          cursor: 'not-allowed',
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          margin: '20px 0',
          fontSize: '0.6875rem',
          color: 'rgba(255, 255, 255, 0.45)',
        }}
      >
        <span style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        OR
        <span style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 14px' }}>
          <Field id="firstName" label="First name" value={form.firstName} onChange={updateField}
            placeholder="First name" autoComplete="given-name" style={nameFieldStyle} />
          <Field id="lastName" label="Last name" value={form.lastName} onChange={updateField}
            placeholder="Last name" autoComplete="family-name" style={nameFieldStyle} />
        </div>
        <Field id="email" label="Email address" type="email" value={form.email} onChange={updateField}
          placeholder="name@domain.com" autoComplete="email" />
        <Field id="password" label="Password" type="password" value={form.password} onChange={updateField}
          placeholder="Password" autoComplete="new-password" />
        <Field id="confirmPassword" label="Confirm password" type="password" value={form.confirmPassword}
          onChange={updateField} placeholder="Confirm password" autoComplete="new-password" />

        <button
          type="submit"
          style={{
            padding: '13px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--color-primary-green)',
            color: 'var(--color-primary-dark-background)',
            fontSize: '0.875rem',
            fontWeight: 'var(--font-weight-bold)',
            boxShadow: '0 0 24px rgba(77, 214, 168, 0.25)',
            cursor: 'pointer',
          }}
        >
          Create account
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8125rem', color: mutedColor }}>
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'var(--color-primary-green)', fontWeight: 'var(--font-weight-bold)', textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
