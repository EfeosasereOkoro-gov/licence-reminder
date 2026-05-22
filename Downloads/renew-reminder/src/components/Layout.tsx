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

        <div className="alpha-notice">
          <div className="govbb-container">
            <p className="alpha-notice__text">
              This page is in{' '}
              <a
                className="govbb-link"
                href="https://alpha.gov.bb/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Alpha
              </a>.
            </p>
          </div>
        </div>
      </header>

      <main id="main-content" className="govbb-container app-main" role="main" tabIndex={-1}>
        <div className="app-main__col">
          {children}

          <aside className="app-feedback" aria-labelledby="feedback-title">
            <h2 id="feedback-title" className="app-feedback__title">
              Was this helpful?
            </h2>
            <p>Give us your feedback about this page.</p>
            <p>
              <a
                className="govbb-link"
                href="https://alpha.gov.bb/feedback"
                target="_blank"
                rel="noopener noreferrer"
              >
                Help us improve alpha.gov.bb
              </a>
            </p>
          </aside>
        </div>
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
