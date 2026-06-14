import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import WorkspaceLayout from './components/WorkspaceLayout';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import PromptLibraryPage from './pages/PromptLibraryPage';
import Assets from './pages/Assets';
import Uploads from './pages/Uploads';
import Settings from './pages/Settings';
import GenerationCombos from './pages/GenerationCombos';
import MetadataLibraryPage from './pages/MetadataLibraryPage';
import GlobalExecutionCenterPage from './pages/GlobalExecutionCenterPage';
import AnalyticsHub from './pages/AnalyticsHub';
import AnalyticsChannelExplorer from './pages/AnalyticsChannelExplorer';
import AnalyticsCompare from './pages/AnalyticsCompare';
import AnalyticsMarketIntelligence from './pages/AnalyticsMarketIntelligence';
import ContextPipelinePage from './pages/ContextPipelinePage';

// Workspace Pages
import WorkspaceOverview from './pages/workspace/WorkspaceOverview';
import ContentPackages from './pages/workspace/ContentPackages';
import CreatePackage from './pages/workspace/CreatePackage';
import PackageDetail from './pages/workspace/PackageDetail';
import UploadQueue from './pages/workspace/UploadQueue';
import PublishedVideos from './pages/workspace/PublishedVideos';
import ChannelSettings from './pages/workspace/ChannelSettings';
import ConnectorsPage from './pages/ConnectorsPage';

import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <Routes>
        {/* Global Routes */}
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsHub />} />
          <Route path="/analytics/market" element={<AnalyticsMarketIntelligence />} />
          <Route path="/analytics/context-pipeline" element={<ContextPipelinePage />} />
          <Route path="/analytics/channel/:id" element={<AnalyticsChannelExplorer />} />
          <Route path="/analytics/compare" element={<AnalyticsCompare />} />
          <Route path="/execution-center" element={<GlobalExecutionCenterPage />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/connectors" element={<ConnectorsPage />} />
          <Route path="/prompts" element={<PromptLibraryPage />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/uploads" element={<Uploads />} />
          <Route path="/generation-combos" element={<GenerationCombos />} />
          <Route path="/metadata-library" element={<MetadataLibraryPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Workspace Routes */}
        <Route path="/workspace/:slug" element={<WorkspaceLayout />}>
          <Route index element={<WorkspaceOverview />} />
          <Route path="packages" element={<ContentPackages />} />
          <Route path="packages/create" element={<CreatePackage />} />
          <Route path="packages/:packageId" element={<PackageDetail />} />
          <Route path="queue" element={<UploadQueue />} />
          <Route path="published" element={<PublishedVideos />} />
          <Route path="assets" element={<Assets />} />
          <Route path="prompts" element={<PromptLibraryPage />} />
          <Route path="settings" element={<ChannelSettings />} />
        </Route>
      </Routes>
      <Toaster theme="dark" position="bottom-right" />
    </Router>
  );
}

export default App;
