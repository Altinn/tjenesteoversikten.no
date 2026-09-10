import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import OrgPage from './pages/OrgPage';
import ResourcePage from './pages/ResourcePage';
import ResourceTypePage from './pages/ResourceTypePage';
import PackagePage from './pages/PackagePage';
import RolePage from './pages/RolePage';
import KeywordPage from './pages/KeywordPage';
import AboutPage from './pages/AboutPage';
import DataSourcesPage from './pages/DataSourcesPage';
import DelegationWizardPage from './pages/DelegationWizardPage';
import SearchResultsPage from './pages/SearchResultsPage';
import AccessMapPage from './pages/AccessMapPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="owners" element={<HomePage />} />
        <Route path="search" element={<HomePage />} />
        <Route path="types" element={<HomePage />} />
        <Route path="packages" element={<HomePage />} />
        <Route path="roles" element={<HomePage />} />
        <Route path="access-map" element={<AccessMapPage />} />
        <Route path="keywords" element={<HomePage />} />
        <Route path="statistics" element={<HomePage />} />
        <Route path="keyword/:word" element={<KeywordPage />} />
        <Route path="org/:orgCode" element={<OrgPage />} />
        <Route path="type/:resourceType" element={<ResourceTypePage />} />
        <Route path="package/:packageId" element={<PackagePage />} />
        <Route path="role/:roleId" element={<RolePage />} />
        <Route path="resource/:id" element={<ResourcePage />} />
        <Route path="results" element={<SearchResultsPage />} />
        <Route path="wizard" element={<DelegationWizardPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="about/data" element={<DataSourcesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
