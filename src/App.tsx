import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import MapPage from './pages/MapPage'
import TourPage from './pages/TourPage'
import MyRoutesPage from './pages/MyRoutesPage'
import ProfilePage from './pages/ProfilePage'
import CourseSharePage from './pages/CourseSharePage'
import AuthListener from './components/AuthListener'
import FuelCompletePage from './pages/FuelCompletePage'
import { FuelProvider } from './context/FuelContext'

export default function App() {
  return (
    <FuelProvider>
      <BrowserRouter>
        <AuthListener />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/fuel-complete" element={<FuelCompletePage />} />
          <Route element={<Layout />}>
            <Route path="/map"        element={<MapPage />} />
            <Route path="/courses"    element={<TourPage />} />
            <Route path="/my-routes"  element={<MyRoutesPage />} />  {/* 내 경로 (중앙 탭) */}
            <Route path="/share"      element={<CourseSharePage />} />
            <Route path="/profile"    element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FuelProvider>
  )
}
