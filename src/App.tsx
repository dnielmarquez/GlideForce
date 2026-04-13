import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ClassesScreen from './screens/ClassesScreen';
import StarsScreen from './screens/StarsScreen';
import ProfileScreen from './screens/ProfileScreen';
import BookingScreen from './screens/BookingScreen';
import BottomNavBar from './components/BottomNavBar';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/classes" element={<ClassesScreen />} />
        <Route path="/stars" element={<StarsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/booking" element={<BookingScreen />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
      <BottomNavBar />
    </Router>
  );
}
