import Card from '../card/card';

const dividerStyle = '1px solid var(--color-white-soft)';
const mutedColor = 'rgba(255, 255, 255, 0.6)';

// Schedule card: "Schedule" heading, time zone underneath, then one row per event.
// Each row uses flexbox: event name + date on the left, time on the right.
export default function ScheduleCard({ timeZone, events = [] }) {
  return (
    <Card style={{ padding: '28px 28px 8px' }}>
      <h2
        style={{
          fontSize: 'var(--text-card-title-size)',
          fontWeight: 'var(--font-weight-bold)',
        }}
      >
        Schedule
      </h2>
      {timeZone && (
        <p
          style={{
            marginTop: '6px',
            fontSize: 'var(--text-card-subtitle-size)',
            color: mutedColor,
          }}
        >
          {timeZone}
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
        {events.map((event) => (
          <li
            key={event.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px 16px',
              padding: '28px 0',
              borderTop: dividerStyle,
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <h3
                style={{
                  fontSize: 'var(--text-card-item-title-size)',
                  fontWeight: 'var(--font-weight-bold)',
                  lineHeight: 1.2,
                }}
              >
                {event.title}
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-card-subtitle-size)',
                  color: mutedColor,
                  lineHeight: 1.2,
                }}
              >
                {event.date}
              </p>
            </div>
            <span
              style={{
                marginLeft: 'auto',
                textAlign: 'right',
                fontSize: 'var(--text-card-item-title-size)',
                whiteSpace: 'nowrap',
              }}
            >
              {event.time}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
