import { NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../lang';
export default function CatalogueNavigation() {
  const { lang, t } = useLang();
  const { pathname } = useLocation();
  const links = [
    ['owners', 'Tjenesteeiere', 'Service owners'], ['types', 'Ressurstyper', 'Resource types'],
    ['packages', 'Tilgangspakker', 'Access packages'], ['roles', 'Roller', 'Roles'],
    ['access-map', t('accessMap.title'), t('accessMap.title')], ['keywords', 'Nøkkelord', 'Keywords'],
    ['statistics', 'Statistikk', 'Statistics'], ['search', 'Avansert søk', 'Advanced search'],
  ];
  return <div className="tabs-scroll section-inner"><nav className="catalogue-tabs" aria-label={lang === 'nb' ? 'Katalogseksjoner' : 'Catalogue sections'}>
    {links.map(([path, nb, en]) => <NavLink key={path} to={`/${path}`} aria-current={path === 'owners' && pathname === '/' ? 'page' : undefined} className={({ isActive }) => isActive || (path === 'owners' && pathname === '/') ? 'active' : ''}>{lang === 'nb' ? nb : en}</NavLink>)}
  </nav></div>;
}