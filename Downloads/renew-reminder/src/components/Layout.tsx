import type { ReactNode } from 'react';

const ASSET = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="govbb-page">
      <header>
        <div className="govbb-official-banner" role="region" aria-label="Official Government of Barbados banner">
          <div className="govbb-container">
            <div className="govbb-official-banner__inner">
              <span className="govbb-official-banner__crest" aria-hidden="true">
                <img
                  src={ASSET('assets/images/govbb-creast.svg')}
                  alt=""
                  className="govbb-official-banner__icon"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </span>
              <span className="govbb-official-banner__text">
                <span>An official website of the Government of Barbados</span>
              </span>
            </div>
          </div>
        </div>

        <div className="govbb-header">
          <div className="govbb-container">
            <div className="govbb-header__inner">
              <a href="https://www.gov.bb" aria-label="Government of Barbados home">
                <img src={ASSET('assets/images/govbb-logo.svg')} alt="Government of Barbados" className="govbb-header__logo" />
              </a>
            </div>
          </div>
        </div>

        <div className="service-bar">
          <div className="govbb-container">
            <div className="service-bar__inner">
              <a href="#/" className="service-bar__name">Renew Reminder</a>
              <span className="service-bar__phase">
                <span className="service-bar__phase-tag">Alpha</span>
                <span className="service-bar__phase-text">
                  This is a new service — your feedback will help us improve it.
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="govbb-container app-main" role="main" tabIndex={-1}>
        <div className="app-main__col">{children}</div>
      </main>

      <footer className="govbb-footer">
        <div className="govbb-container">
          <div className="govbb-footer__inner">
            <nav className="govbb-footer__nav" aria-label="Footer">
              <a className="govbb-footer__link" href="#/privacy">Privacy</a>
              <a className="govbb-footer__link" href="#/accessibility">Accessibility statement</a>
              <a className="govbb-footer__link" href="https://www.gov.bb">Government of Barbados</a>
            </nav>
            <hr className="govbb-footer__divider" />
            <div className="govbb-footer__end">
              <img
                src={ASSET('assets/images/govbb-creast.svg')}
                alt=""
                aria-hidden="true"
                className="govbb-footer__coat app-footer-crest"
              />
              <p className="govbb-footer__copy">
                © Government of Barbados {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
