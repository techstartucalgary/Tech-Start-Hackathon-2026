import Link from 'next/link';

export default function Header() {
  return (
    <>
      <header className="global-header">
        <Link href="/" className="global-header-logo" aria-label="TechStart home">
          <img src="/techstart-logo.png" alt="TechStart" width="340" height="132" />
        </Link>
      </header>
      <style jsx>{`
        .global-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          height: var(--header-height);
          padding: 0 var(--header-padding-x);
          box-sizing: border-box;
          background: color-mix(in srgb, var(--color-primary-dark-background) 72%, transparent);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-white-soft);
        }

        .global-header :global(.global-header-logo) {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .global-header img {
          display: block;
          height: var(--header-logo-height);
          width: auto;
        }
      `}</style>
    </>
  );
}
