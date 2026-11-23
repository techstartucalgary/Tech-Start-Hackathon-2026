export default function Card({ children, style }) {     // children is whatever you put between <Card> and </Card>, style lets a specific card override or add styling!
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        borderRadius: '24px',
        background: 'var(--gradient-dark-background)',
        border: '1px solid var(--color-white-soft)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}