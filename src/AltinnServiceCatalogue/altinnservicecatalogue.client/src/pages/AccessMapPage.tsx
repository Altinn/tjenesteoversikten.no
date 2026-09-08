import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Textfield } from '@digdir/designsystemet-react';
import CatalogueNavigation from '../components/CatalogueNavigation';
import RolePackageTree from '../components/access-map/RolePackageTree';
import { useEnv } from '../env';
import { useLang } from '../lang';
import { useRolePackageMap } from '../hooks/useRolePackageMap';
import { filterGroups, groupPackages, readMapState, roleName, validId, writeMapState, type AccessMapViewState } from '../accessMap';
import '../access-map.css';

export default function AccessMapPage() {
  const { env, setEnv } = useEnv(), { lang, t } = useLang();
  const location = useLocation(), navigate = useNavigate();
  const [roleQuery, setRoleQuery] = useState('');
  const saved = readMapState(location.search);
  const history = location.state as { accessMapEnv?: string; accessMapNotice?: string } | null;
  const changedEnv = !!history?.accessMapEnv && history.accessMapEnv !== env;
  const state = changedEnv ? { ...saved, q: '', open: [], custom: false } : saved;
  const { roles, rolesError, data, error, retry } = useRolePackageMap(env, state.role, state.variant);
  const groups = useMemo(() => groupPackages(data?.selection.packages ?? [], lang, t('accessMap.ungrouped')), [data, lang, t]);
  const visible = filterGroups(groups, state.q, lang);
  const filteredRoles = (roles ?? []).filter(r => `${roleName(r)} ${r.code ?? ''}`.toLocaleLowerCase(lang).includes(roleQuery.trim().toLocaleLowerCase(lang)));
  const selectedRole = roles?.find(r => r.id.toLowerCase() === state.role);
  const options = selectedRole && !filteredRoles.includes(selectedRole) ? [selectedRole, ...filteredRoles] : filteredRoles;
  const open = state.custom ? state.open : groups.map(g => g.id);
  const count = visible.reduce((sum, g) => sum + g.packages.length, 0);
  const searching = !!state.q.trim();
  const update = (next: AccessMapViewState, notice?: string) => navigate({ pathname: '/access-map', search: writeMapState(next) }, {
    replace: true, state: { accessMapEnv: env, accessMapNotice: notice },
  });

  useEffect(() => {
    // History carries only an environment marker, never metadata or an environment override.
    const current = readMapState(location.search);
    let notice = history?.accessMapNotice;
    if (changedEnv) { current.q = ''; current.open = []; current.custom = false; notice = 'environmentChanged'; }
    if (current.role && validId(current.role) && ((roles && !roles.some(r => r.id.toLowerCase() === current.role)) || error === 'role_not_found')) {
      current.role = ''; current.variant = 'person'; current.q = ''; current.open = []; current.custom = false; notice = 'roleGone';
    } else if (error === 'invalid_variant' && current.variant !== 'person') {
      current.variant = 'person'; current.q = ''; current.open = []; current.custom = false; notice = 'variantGone';
    }
    if (data?.selection.status === 'complete' && !changedEnv) current.open = current.open.filter(id => groups.some(g => g.id === id));
    const search = writeMapState(current);
    if (search !== location.search.replace(/^\?/, '') || history?.accessMapEnv !== env || notice !== history?.accessMapNotice)
      navigate({ pathname: '/access-map', search }, { replace: true, state: { accessMapEnv: env, accessMapNotice: notice } });
  }, [location.search, history?.accessMapEnv, history?.accessMapNotice, changedEnv, env, roles, error, data, groups, navigate]);

  const notice = changedEnv ? 'environmentChanged' : history?.accessMapNotice;
  const invalidRole = !!state.role && !validId(state.role);
  const loading = !roles && !rolesError || !!state.role && !invalidRole && !data && !error;
  const contextItems = data?.contextDiscovery.items ?? [{ code: 'person', kind: 'person' }];
  const currentContext = contextItems.find(c => c.code.toLowerCase() === state.variant.toLowerCase());
  const contextLabel = currentContext?.code === 'person' ? t('accessMap.person') : currentContext?.description || state.variant;
  const incomplete = data && data.status !== 'complete';
  return <div className="access-map-page">
    <CatalogueNavigation />
    <div className="section-inner access-map-inner">
      <header className="access-map-header">
        <span className="access-eyebrow">{t('accessMap.eyebrow')}</span>
        <h1>{t('accessMap.title')}</h1>
        <p>{t('accessMap.intro')}</p>
        <p className="access-explanation">{t('accessMap.catalogue')}</p>
      </header>
      <fieldset className="access-mobile-env">
        <legend>{lang === 'nb' ? 'Miljø' : 'Environment'}</legend>
        <button type="button" aria-pressed={env === 'prod'} onClick={() => setEnv('prod')}>PROD</button>
        <button type="button" aria-pressed={env === 'tt02'} onClick={() => setEnv('tt02')}>TT02</button>
      </fieldset>
      <div className="access-controls">
        <Textfield label={t('accessMap.findRole')} value={roleQuery} onChange={e => setRoleQuery(e.target.value)} />
        <div className="access-select"><label htmlFor="access-role">{t('accessMap.chooseRole')}</label>
          <select id="access-role" value={selectedRole?.id ?? ''} onChange={e => update({ role: e.target.value, variant: 'person', q: '', open: [], custom: false })}>
            <option value="">{t('accessMap.chooseRole')}</option>
            {options.map(r => <option key={r.id} value={r.id}>{roleName(r)}{r.code ? ` (${r.code})` : ''}</option>)}
          </select>
        </div>
        <div className="access-select"><label htmlFor="access-context">{t('accessMap.context')}</label>
          <select id="access-context" disabled={!state.role || invalidRole} value={currentContext?.code ?? state.variant} onChange={e => update({ ...state, variant: e.target.value, q: '', open: [], custom: false })}>
            {!currentContext && <option value={state.variant}>{state.variant}</option>}
            {contextItems.map(c => <option key={c.code} value={c.code}>{c.code === 'person' ? t('accessMap.person') : `${c.description || c.code} (${c.code})`}</option>)}
          </select>
        </div>
      </div>
      <div className="access-status" role="status" aria-live="polite">
        {loading && <p>{t('accessMap.loading')}</p>}
        {notice && <p>{t(`accessMap.${notice}`)}</p>}
        {invalidRole && <p>{t('accessMap.roleGone')}</p>}
        {roles && <p className="access-role-count">{filteredRoles.length} {t('accessMap.roleMatches')}</p>}
        {roles?.length === 0 && <p>{t('accessMap.noRoles')}</p>}
        {roles && roles.length > 0 && !filteredRoles.length && <p>{t('accessMap.noRoleMatches')}</p>}
        {(rolesError || error) && <p>{t('accessMap.error')}</p>}
        {incomplete && <p>{t('accessMap.partial')} {t(data.contextDiscovery.status === 'failed' ? 'accessMap.contextError' : 'accessMap.packageError')}</p>}
      </div>
      {(rolesError || error || incomplete) && <Button variant="secondary" onClick={retry}>{t('accessMap.retry')}</Button>}
      {!state.role && !rolesError && <div className="access-empty"><span aria-hidden="true">↳</span><h2>{t('accessMap.start')}</h2><p>{t('accessMap.startHint')}</p></div>}
      {data && <div className="access-results">
        <div className="access-search-row">
          <Textfield label={t('accessMap.findPackage')} value={state.q} onChange={e => update({ ...state, q: e.target.value })} />
          {state.q && <Button variant="tertiary" onClick={() => update({ ...state, q: '' })}>{t('accessMap.clear')}</Button>}
        </div>
        <p className="access-summary" role="status">{data.selection.status === 'complete' ? `${incomplete ? t('accessMap.provisional') + ' ' : ''}${count} ${t('accessMap.of')} ${data.selection.packageCount} ${t('accessMap.packages')}` : t('accessMap.packageError')}</p>
        <p className="access-explanation">{t('accessMap.grouping')}</p>
        {data.status === 'complete' && data.selection.packageCount === 0 && <p>{t('accessMap.empty')}</p>}
        {searching && data.selection.status === 'complete' && data.selection.packageCount > 0 && count === 0 && <p>{t('accessMap.noMatches')}</p>}
        <RolePackageTree role={data.role} groups={visible} open={open} searching={searching} context={contextLabel}
          toggle={id => update({ ...state, custom: true, open: open.includes(id) ? open.filter(k => k !== id) : [...open, id] })} />
      </div>}
    </div>
  </div>;
}