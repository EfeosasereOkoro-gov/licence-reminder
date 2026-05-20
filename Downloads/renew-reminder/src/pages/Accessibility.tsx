import { BackLink } from '../components/BackLink';

export function Accessibility() {
  return (
    <>
      <BackLink to="/" />
      <h1 className="govbb-text-h2 app-mb-m">Accessibility statement</h1>
      <div className="app-prose app-stack-s">
        <p>
          We want this service to be usable by as many people as possible. We aim to meet
          WCAG 2.1 AA and the Barbados Digital Service Standards.
        </p>
        <p>This service is designed to:</p>
        <ul>
          <li>be navigable using a keyboard alone</li>
          <li>work with screen readers and other assistive technologies</li>
          <li>resize text up to 200% without loss of content</li>
          <li>have a clear contrast ratio in all interface states</li>
        </ul>

        <h2 className="govbb-text-h3 app-mt-m">Reporting accessibility problems</h2>
        <p>
          If you find a problem or think we're not meeting these standards, please let us
          know.
        </p>

        <p className="app-mt-m">
          <strong>Note:</strong> This is an alpha prototype. Final accessibility testing
          will be carried out before the service moves to public beta.
        </p>
      </div>
    </>
  );
}
