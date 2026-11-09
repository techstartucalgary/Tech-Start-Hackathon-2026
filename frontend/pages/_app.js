import '../styles/globals.css';
import Header from '../components/header/header';
import { useRouter } from 'next/router';
import ParticipantLayout from '../components/participant-layout/participant-layout';
import { getParticipantRoute } from '../components/participant-layout/navigation';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  if (getParticipantRoute(router.pathname)) {
    return (
      <ParticipantLayout>
        <Component {...pageProps} />
      </ParticipantLayout>
    );
  }

  return (
    <>
      <Header />
      <main className="page-content">
        <Component {...pageProps} />
      </main>
    </>
  );
}
