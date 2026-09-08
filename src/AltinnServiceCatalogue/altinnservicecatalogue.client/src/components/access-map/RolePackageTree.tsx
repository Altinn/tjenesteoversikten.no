import { Link } from 'react-router-dom';
import type { RoleDto } from '../../types';
import type { AreaBranch } from '../../accessMap';
import { packageName, roleName } from '../../accessMap';
import { packagePath } from '../../helpers';
import { useLang } from '../../lang';
export default function RolePackageTree({ role, groups, open, searching, toggle, context }: {
  role: RoleDto; groups: AreaBranch[]; open: string[]; searching: boolean; toggle: (id: string) => void; context: string;
}) {
  const { lang, t } = useLang();
  return <section className="access-tree" aria-label={t('accessMap.tree')}>
    <div className="access-root">
      <span className="access-node-type">{t('accessMap.role')}</span>
      <h2><Link to={`/role/${role.id}`}>{roleName(role)} <span aria-hidden="true">↗</span></Link></h2>
      <p className="access-root-code">{role.code || role.urn || role.id}</p>
      <div className="access-context-badge">{t('accessMap.context')}: {context}</div>
      <p>{t('accessMap.rootHint')}</p>
    </div>
    <ul className="access-branches" aria-label={t('accessMap.areas')}>
      {groups.map(group => {
        const expanded = searching || open.includes(group.id);
        return <li key={group.id} className="access-branch">
          <button className="access-area-toggle" aria-expanded={expanded} aria-controls={`area-${group.id}`} onClick={() => toggle(group.id)}>
            <span aria-hidden="true" className="access-disclosure">{expanded ? '−' : '+'}</span>
            <span><small>{t('accessMap.area')}</small><strong>{group.name}</strong></span>
            <span className="access-count">{searching ? `${group.packages.length} / ${group.total}` : group.total}</span>
          </button>
          <ul id={`area-${group.id}`} className="access-leaves" hidden={!expanded}>
            {group.packages.map(pkg => <li key={pkg.id}>
              <Link to={packagePath(pkg)} className="access-leaf">
                <span className="access-node-type">{t('accessMap.package')}</span>
                <strong>{packageName(pkg, lang)}</strong>
                <span className="access-identity">{pkg.urn || pkg.id}</span>
                <span aria-hidden="true" className="access-leaf-arrow">↗</span>
              </Link>
            </li>)}
          </ul>
        </li>;
      })}
    </ul>
  </section>;
}