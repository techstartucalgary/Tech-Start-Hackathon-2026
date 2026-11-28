import { useRef, useState } from 'react';
import Card from '../card/card';

// Placeholder until the real Devpost hackathon page exists (out of scope for SCRUM-26).
const DEVPOST_URL = 'https://devpost.com/';
const DUE_DATE_TEXT = 'Due Oct 18 at 11:00 AM MT';

const mutedColor = 'rgba(255, 255, 255, 0.6)';

const smallButtonStyle = {
  flexShrink: 0,
  padding: '0 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'transparent',
  fontSize: 'var(--text-card-subtitle-size)',
  fontWeight: 'var(--font-weight-bold)',
  cursor: 'pointer',
};

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}

// Submission & Screening card. The Devpost link lives in React state only:
// it is NOT saved to the backend yet (a future story), so it resets on page reload.
export default function SubmissionCard() {
  const [savedLink, setSavedLink] = useState('');
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(true); // nothing saved yet, so start in edit mode
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // After saving, show the start of the link instead of wherever the cursor was.
  function resetInputScroll() {
    if (inputRef.current) {
      inputRef.current.blur();
      inputRef.current.scrollLeft = 0;
    }
  }

  function handleEditOrSave() {
    if (!isEditing) {
      setDraft(savedLink);
      setIsEditing(true);
      return;
    }
    const value = draft.trim();
    if (!isValidUrl(value)) {
      setError('Enter a full link, e.g. https://devpost.com/software/your-project');
      return;
    }
    setSavedLink(value);
    setDraft(value);
    setError('');
    setIsEditing(false);
    resetInputScroll();
  }

  function handleDelete() {
    setSavedLink('');
    setDraft('');
    setError('');
    setIsEditing(true);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') handleEditOrSave();
    if (event.key === 'Escape' && savedLink) {
      setDraft(savedLink);
      setError('');
      setIsEditing(false);
    }
  }

  return (
    <Card style={{ padding: '28px' }}>
      <h2
        style={{
          fontSize: 'var(--text-card-title-size)',
          fontWeight: 'var(--font-weight-bold)',
        }}
      >
        Submission & Screening
      </h2>
      <p
        style={{
          marginTop: '12px',
          fontSize: 'var(--text-card-subtitle-size)',
          lineHeight: 1.6,
          color: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        Create your project page, upload the demo, and track screening status on Devpost.
        Reviews are not handled in this portal.
      </p>

      <label
        htmlFor="devpost-link"
        style={{
          display: 'block',
          marginTop: '20px',
          marginBottom: '10px',
          fontSize: 'var(--text-card-subtitle-size)',
          fontWeight: 'var(--font-weight-bold)',
        }}
      >
        Devpost Link:
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <input
          id="devpost-link"
          ref={inputRef}
          type="url"
          value={isEditing ? draft : savedLink}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={!isEditing}
          placeholder="https://devpost.com/software/your-project"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'devpost-link-error' : undefined}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '11px 12px',
            borderRadius: '8px',
            border: `1px solid ${error ? 'var(--color-danger)' : 'rgba(255, 255, 255, 0.15)'}`,
            background: isEditing ? 'var(--color-deep-black)' : 'transparent',
            fontSize: 'var(--text-card-subtitle-size)',
            color: isEditing || savedLink ? 'var(--color-white)' : mutedColor,
            outline: 'none',
            textOverflow: 'ellipsis',
          }}
        />
        <button type="button" onClick={handleEditOrSave} style={smallButtonStyle}>
          {isEditing ? 'Save' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!savedLink && !draft}
          style={{
            ...smallButtonStyle,
            color: 'var(--color-danger)',
            borderColor: 'var(--color-danger)',
            opacity: !savedLink && !draft ? 0.4 : 1,
            cursor: !savedLink && !draft ? 'not-allowed' : 'pointer',
          }}
        >
          Delete
        </button>
      </div>
      {error && (
        <p
          id="devpost-link-error"
          role="alert"
          style={{ marginTop: '8px', fontSize: 'var(--text-card-subtitle-size)', color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      )}

      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '14px',
          fontSize: 'var(--text-card-subtitle-size)',
          color: 'var(--color-secondary-lime)',
        }}
      >
        <CalendarIcon />
        {DUE_DATE_TEXT}
      </p>

      <a
        href={DEVPOST_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '20px',
          padding: '14px',
          borderRadius: '12px',
          background: 'var(--color-primary-green)',
          color: 'var(--color-primary-dark-background)',
          fontSize: 'var(--text-card-item-title-size)',
          fontWeight: 'var(--font-weight-bold)',
          textDecoration: 'none',
        }}
      >
        <ExternalLinkIcon />
        Open Devpost
      </a>
    </Card>
  );
}
