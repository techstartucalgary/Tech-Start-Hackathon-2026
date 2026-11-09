import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getParticipantRoute, participantRoutes } from './navigation';
import styles from './participant-layout.module.css';

function Icon({ name }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="6" height="8" rx="1" />
        <rect x="15" y="3" width="6" height="5" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="15" y="12" width="6" height="9" rx="1" />
      </>
    ),
    people: (
      <>
        <circle cx="10" cy="7" r="4" />
        <path d="M2 21v-2a8 8 0 0 1 16 0v2M17 3a4 4 0 0 1 0 8M21 21v-2a8 8 0 0 0-3-6" />
      </>
    ),
    group: (
      <>
        <rect x="3" y="12" width="9" height="9" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <path d="M3 10V5a1 1 0 0 1 1-1h6M15 14v7M3 16h9" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v5M16 2v5M3 10h17M10 21H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
        <circle cx="17" cy="17" r="5" />
        <path d="M17 14v3l2 1" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3M12 17h.01" />
      </>
    ),
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

function SidebarContents({ activeHref, onNavigate }) {
  return (
    <>
      <div className={styles.brand}>
        <p>TECH START</p>
        <p className={styles.tagline}>A tech club for dreamers and doers</p>
      </div>
      <div className={styles.event}>
        <p>Hack the Northstar</p>
        <p className={styles.eventDetails}>Oct 16–18, 2026 · Calgary</p>
      </div>
      <nav className={styles.navigation} aria-label="Main navigation">
        <ul>
          {participantRoutes.map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={styles.link}
                aria-current={href === activeHref ? 'page' : undefined}
                onClick={onNavigate}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          P
        </span>
        <div>
          <p className={styles.profileName}>Participant</p>
          <p className={styles.profileDetail}>Hackathon attendee</p>
        </div>
      </div>
    </>
  );
}

export default function ParticipantLayout({ children }) {
  const router = useRouter();
  const activeRoute = getParticipantRoute(router.pathname);
  const dialogRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function openMenu() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    function onRouteChange() {
      dialogRef.current?.close();
      setIsOpen(false);
      mainRef.current?.focus({ preventScroll: true });
    }
    const desktop = window.matchMedia('(min-width: 768px)');
    function onResize() {
      if (desktop.matches && dialogRef.current?.open) {
        dialogRef.current.close();
        setIsOpen(false);
        sidebarRef.current?.querySelector('[aria-current="page"]')?.focus();
      }
    }
    router.events.on('routeChangeComplete', onRouteChange);
    desktop.addEventListener('change', onResize);
    return () => {
      router.events.off('routeChangeComplete', onRouteChange);
      desktop.removeEventListener('change', onResize);
    };
  }, [router.events]);

  function onMobileNavigate(event) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    closeMenu();
    mainRef.current?.focus({ preventScroll: true });
  }

  function onDialogKeyDown(event) {
    if (event.key !== 'Tab') return;
    const controls = event.currentTarget.querySelectorAll('button, a[href]');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#participant-content">
        Skip to content
      </a>
      <aside ref={sidebarRef} className={styles.sidebar}>
        <SidebarContents activeHref={activeRoute?.href} />
      </aside>
      <header className={styles.mobileHeader}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Open navigation"
          aria-controls="participant-navigation"
          aria-expanded={isOpen}
          onClick={openMenu}
        >
          <Icon name="menu" />
        </button>
        <span>TECH START</span>
      </header>
      <dialog
        ref={dialogRef}
        id="participant-navigation"
        className={styles.drawer}
        aria-label="Event navigation"
        onKeyDown={onDialogKeyDown}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className={styles.drawerContent}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.closeButton}`}
            aria-label="Close navigation"
            onClick={closeMenu}
            autoFocus
          >
            <Icon name="close" />
          </button>
          <SidebarContents
            activeHref={activeRoute?.href}
            onNavigate={onMobileNavigate}
          />
        </div>
      </dialog>
      <main
        ref={mainRef}
        id="participant-content"
        tabIndex={-1}
        className={styles.content}
      >
        {children}
      </main>
    </div>
  );
}
