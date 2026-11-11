import { useState } from 'react';
import Link from 'next/link';

const AVATAR_COLORS = [
  'var(--color-turquoise-blue)',
  'var(--color-turquoise-green)',
  'var(--color-secondary-lime)',
  'var(--color-lightwash-green)',
];

function getInitials(fullName) {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const cardStyle = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '28px',
  borderRadius: '24px',
  background: 'var(--gradient-dark-background)',
  border: '1px solid var(--color-white-soft)',
};

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 24px',
  borderRadius: '14px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  fontWeight: 'var(--font-weight-bold)',
  textDecoration: 'none',
};

const mutedText = { color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' };

export default function TeamInfoCard({ team }) {
  const [activeId, setActiveId] = useState(null);

  // Not in a team
  if (!team) {
    return (
      <div style={cardStyle}>
        <p style={{ marginBottom: '16px' }}>Join a team to view team information</p>
        <Link href="/find-a-team" style={buttonStyle}>
          Find a Team
        </Link>
      </div>
    );
  }

  const count = team.members.length;

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'var(--font-weight-bold)' }}>
            {team.name}
          </h2>
          {team.tagline && (
            <p style={{ ...mutedText, marginTop: '8px' }}>{team.tagline}</p>
          )}
        </div>
        <Link href="/my-team" style={buttonStyle}>
          <span aria-hidden="true">↗</span>
          Open Workspace
        </Link>
      </div>

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--color-white-soft)',
          margin: '24px 0',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {team.members.map((member, index) => (
            <div
              key={member.id}
              tabIndex={0}
              aria-label={member.fullName}
              onMouseEnter={() => setActiveId(member.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(member.id)}
              onBlur={() => setActiveId(null)}
              style={{
                position: 'relative',
                marginLeft: index === 0 ? 0 : '-8px',
                zIndex: activeId === member.id ? 2 : 1,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid var(--color-white)',
                  background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                  color: 'var(--color-primary-dark-background)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getInitials(member.fullName)}
              </div>
              {activeId === member.id && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    bottom: '48px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--color-deep-black)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {member.fullName}
                </div>
              )}
            </div>
          ))}
        </div>
        <span style={mutedText}>
          {count} {count === 1 ? 'member' : 'members'}
        </span>
      </div>
    </div>
  );
}