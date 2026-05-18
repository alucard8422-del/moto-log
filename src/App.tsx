import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import MapPage from './pages/MapPage'
import TourPage from './pages/TourPage'
import MyRoutesPage from './pages/MyRoutesPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import RoutePlanner from './pages/RoutePlanner'
import GaragePage from './pages/garage/GaragePage'
import VideoCreatorPage from './pages/video/VideoCreatorPage'
import VideoPreviewPage from './pages/video/VideoPreviewPage'
import AuthListener from './components/AuthListener'
import FuelCompletePage from './pages/FuelCompletePage'
import { FuelProvider } from './context/FuelContext'
import { ThemeProvider } from './context/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <FuelProvider>
        <BrowserRouter>
          <AuthListener />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/fuel-complete"  element={<FuelCompletePage />} />
            {/* 독립 전체화면 — Layout(헤더·탭바) 없이 렌더 */}
            <Route path="/route-planner"              element={<RoutePlanner />} />
            <Route path="/video-creator/:courseId"    element={<VideoCreatorPage />} />
            <Route path="/video-preview/:courseId"    element={<VideoPreviewPage />} />
            <Route element={<Layout />}>
              <Route path="/map"        element={<MapPage />} />
              <Route path="/courses"    element={<TourPage />} />
              <Route path="/my-routes"  element={<MyRoutesPage />} />
              <Route path="/garage"     element={<GaragePage />} />
              <Route path="/profile"    element={<ProfilePage />} />
              <Route path="/settings"   element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FuelProvider>
    </ThemeProvider>
  )
}
