import Card from '../card/card';

export default function LoginCard() {
  return (
    <Card
      style={{
        maxWidth: '480px',
        height: '68%',
        borderRadius: '30px',
        boxShadow: '0 30px 80px var(--color-shadow)',
      }}/>
  );
}