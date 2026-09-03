import { useLang } from '../lang';

/** Which sentence to use — the subject differs between a package, a role and a plain list. */
export type RetiredContext = 'package' | 'role' | 'list';

/**
 * Tells the reader that hidden or retired services were left out of the list above,
 * and lets them pull those services in.
 */
export default function RetiredServicesNotice({
  count,
  expanded,
  onToggle,
  context = 'list',
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  context?: RetiredContext;
}) {
  const { t } = useLang();
  if (count === 0) return null;

  return (
    <div className="retired-notice">
      <p>{t(`retired.notice.${context}`).replace('{count}', String(count))}</p>
      <button type="button" onClick={onToggle} aria-expanded={expanded}>
        {expanded ? t('retired.hide') : t('retired.show')}
      </button>
    </div>
  );
}
