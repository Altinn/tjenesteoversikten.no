import { Heading } from '@digdir/designsystemet-react';
import { useLang } from '../lang';

export default function AboutPage() {
  const { t } = useLang();

  return (
    <div className="max-w-2xl mx-auto py-4">
      <Heading level={1} data-size="xl" className="mb-6">
        {t('about.title')}
      </Heading>

      <div
        className="rounded-xl p-8 flex flex-col gap-5"
        style={{ backgroundColor: 'var(--ds-color-neutral-surface-default)' }}
      >
        <Heading level={2} data-size="sm">
          {t('about.welcome')}
        </Heading>

        <p style={{ color: 'var(--ds-color-neutral-text-default)', lineHeight: '1.7' }}>
          {t('about.description')}
        </p>

        <p style={{ color: 'var(--ds-color-neutral-text-default)', lineHeight: '1.7' }}>
          {t('about.openApi')}
        </p>

        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: 'var(--ds-color-warning-surface-default)', border: '1px solid var(--ds-color-warning-border-default)' }}
        >
          <p style={{ color: 'var(--ds-color-neutral-text-default)', lineHeight: '1.7', margin: 0 }}>
            {t('about.purpose')} {t('about.team')}
          </p>
        </div>

        <div>
          <p style={{ color: 'var(--ds-color-neutral-text-default)', lineHeight: '1.7' }}>
            {t('about.sourceCode')}
          </p>
          <a
            href="https://github.com/Altinn/tjenesteoversikten.no/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--ds-color-accent-text-subtle)' }}
            className="hover:underline break-all"
          >
            https://github.com/Altinn/tjenesteoversikten.no/
          </a>
        </div>
      </div>
    </div>
  );
}
