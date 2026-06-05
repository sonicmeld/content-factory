import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Minimal Placeholder Components
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#121212', color: '#ffffff' }}>
    <aside style={{ width: '250px', padding: '20px', borderRight: '1px solid #333' }}>
      <h2>Content Factory</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
        <Link to="/channels" style={{ color: '#fff', textDecoration: 'none' }}>Channels</Link>
        <Link to="/assets" style={{ color: '#fff', textDecoration: 'none' }}>Assets</Link>
        <Link to="/uploads" style={{ color: '#fff', textDecoration: 'none' }}>Uploads</Link>
        <Link to="/scheduler" style={{ color: '#fff', textDecoration: 'none' }}>Scheduler</Link>
        <Link to="/settings" style={{ color: '#fff', textDecoration: 'none' }}>Settings</Link>
      </nav>
    </aside>
    <main style={{ flex: 1, padding: '20px' }}>
      {children}
    </main>
  </div>
);

const Dashboard = () => <div><h1>Dashboard</h1></div>;
const Channels = () => <div><h1>Channels</h1></div>;
const Assets = () => <div><h1>Assets</h1></div>;
const Uploads = () => <div><h1>Uploads</h1></div>;
const Scheduler = () => <div><h1>Scheduler</h1></div>;
const Settings = () => <div><h1>Settings</h1></div>;

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/uploads" element={<Uploads />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
