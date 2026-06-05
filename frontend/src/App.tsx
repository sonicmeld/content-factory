import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import PromptFactory from './pages/PromptFactory';
import Assets from './pages/Assets';
import Uploads from './pages/Uploads';
import Settings from './pages/Settings';
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/prompts" element={<PromptFactory />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/uploads" element={<Uploads />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster theme="dark" position="bottom-right" />
    </Router>
  );
}

export default App;
