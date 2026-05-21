import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SplashScreen from './components/SplashScreen'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import MapPage from './features/record/MapPage'
import TourPage from './features/tour/TourPage'
import MyRoutesPage from './features/my-routes/MyRoutesPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import RoutePlanner from './features/my-routes/RoutePlanner'
import GaragePage from './pages/garage/GaragePage'
import VideoCreatorPage from './features/my-routes/video/VideoCreatorPage'
import VideoPreviewPage from './features/my-routes/video/VideoPreviewPage'
import AuthListener from './components/AuthListener'
import FuelCompletePage from './pages/FuelCompletePage'
import { FuelProvider } from './context/FuelContext'
import { ThemeProvider } from './context/ThemeContext'

export default function App() {
  // 세션당 1회만 스플래시 표시
  const [splashDone, setSplashDone] = useState(() => {
    return sessionStorage.getItem('moto_splash') === '1'
  })

  const handleSplashComplete = () => {
    sessionStorage.setItem('moto_splash', '1')
    setSplashDone(true)
  }

  if (!splashDone) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  return (
    <ThemeProvider>
      <FuelProvider>
        <BrowserRouter>
          <AuthListener />
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
      </FuelProvider>
    </ThemeProvider>
  )
}
