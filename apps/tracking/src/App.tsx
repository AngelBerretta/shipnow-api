import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import HomePage from './pages/HomePage';
import TrackingPage from './pages/TrackingPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="seguimiento/:code" element={<TrackingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}