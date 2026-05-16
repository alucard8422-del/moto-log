import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import MapPage from './pages/MapPage'
import TourPage from './pages/TourPage'
import ProfilePage from './pages/ProfilePage'
import AuthListener from './components/AuthListener'
import { FuelProvider } from './context/FuelContext'

export default function App() {
  return (
    <FuelProvider>
    <BrowserRouter>
      <AuthListener />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<Layout />}>
          <Route path="/map" element={<MapPage />} />
          <Route path="/courses" element={<TourPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </FuelProvider>
  )
}
