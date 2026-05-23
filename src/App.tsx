import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import MapPage from './features/record/MapPage'
import TourPage from './features/tour/TourPage'
import MyRoutesPage from './features/my-routes/MyRoutesPage'
import ProfilePage from './features/profile/ProfilePage'
import SettingsPage from './features/profile/SettingsPage'
import RoutePlanner from './features/my-routes/RoutePlanner'
import GaragePage from './features/garage/GaragePage'
import VideoCreatorPage from './features/my-routes/video/VideoCreatorPage'
import VideoPreviewPage from './features/my-routes/video/VideoPreviewPage'
import AuthListener from './components/AuthListener'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import FuelCompletePage from './features/profile/FuelCompletePage'
import { FuelProvider }       from './context/FuelContext'
import { ThemeProvider }      from './context/ThemeContext'
import { RideRecordProvider } from './context/RideRecordContext'

export default function App() {
  return (
    <ThemeProvider>
      <FuelProvider>
        <RideRecordProvider>
          <BrowserRouter>
            <AuthListener />
            <PWAUpdatePrompt />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/fuel-complete" element={<FuelCompletePage />} />
              {/* 독립 전체화면 — Layout(헤더·탭바) 없이 렌더 */}
              <Route path="/video-creator/:courseId" element={<VideoCreatorPage />} />
              <Route path="/video-preview/:courseId" element={<VideoPreviewPage />} />
              <Route element={<Layout />}>
                <Route path="/map"           element={<MapPage />} />
                <Route path="/courses"       element={<TourPage />} />
                <Route path="/my-routes"     element={<MyRoutesPage />} />
                <Route path="/garage"        element={<GaragePage />} />
                <Route path="/profile"       element={<ProfilePage />} />
                <Route path="/settings"      element={<SettingsPage />} />
                <Route path="/route-planner" element={<RoutePlanner />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RideRecordProvider>
      </FuelProvider>
    </ThemeProvider>
  )
}
