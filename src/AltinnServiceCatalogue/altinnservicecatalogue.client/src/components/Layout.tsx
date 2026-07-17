import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useLang } from '../lang';
import { useEnv } from '../env';
import { useTheme } from '../theme';

const HOME_PATHS = new Set(['/', '/owners', '/types', '/packages', '/roles', '/keywords', '/statistics', '/search']);

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="tjenesteoversikten.no">
      <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5 6.5 12 13 4.5" /></svg></span>
      <span><b>tjeneste</b>oversikten<span className="brand-domain">.no</span></span>
    </Link>
  );
}

export default function Layout() {
  const { lang, setLang } = useLang();
  const { env, setEnv } = useEnv();
  const { colorScheme, setColorScheme } = useTheme();
  const location = useLocation();
  const isHome = HOME_PATHS.has(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  const isDark = colorScheme === 'dark' || (colorScheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <div className="header-actions">
            <nav className="main-nav" aria-label={lang === 'nb' ? 'Hovedmeny' : 'Main navigation'}>
              <NavLink to="/">{lang === 'nb' ? 'Hjem' : 'Home'}</NavLink>
              <NavLink to="/wizard">{lang === 'nb' ? 'Tilgangsveiviser' : 'Access wizard'}</NavLink>
              <NavLink to="/about">{lang === 'nb' ? 'Om tjenesten' : 'About'}</NavLink>
            </nav>
            <div className="segmented" aria-label="Miljø">
              <button className={env === 'tt02' ? 'active' : ''} onClick={() => setEnv('tt02')}>TT02</button>
              <button className={env === 'prod' ? 'active' : ''} onClick={() => setEnv('prod')}>PROD</button>
            </div>
            <div className="language-switch" aria-label="Language">
              <button className={lang === 'nb' ? 'active' : ''} onClick={() => setLang('nb')}>NO</button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <button className="theme-toggle" onClick={() => setColorScheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Bruk lyst tema' : 'Bruk mørkt tema'} title={colorScheme === 'auto' ? 'Tema følger systemet' : undefined}><span aria-hidden="true">{isDark ? '☀' : '☾'}</span></button>
          </div>
        </div>
      </header>
      <main className={isHome ? 'home-main' : 'page-main'}><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>{lang === 'nb' ? 'Laget av teamet bak Altinn Autorisasjon — uoffisielt hobbyprosjekt' : 'Built by the team behind Altinn Authorization — unofficial hobby project'}</span>
          <span>{lang === 'nb' ? 'Data fra Altinn ressursregister' : 'Data from the Altinn resource registry'} · {env === 'prod' ? 'platform.altinn.no' : 'platform.tt02.altinn.no'}</span>
        </div>
      </footer>
    </div>
  );
}
