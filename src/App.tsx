import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ClassesScreen from './screens/ClassesScreen';
import StarsScreen from './screens/StarsScreen';
import ProfileScreen from './screens/ProfileScreen';
import BookingScreen from './screens/BookingScreen';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/classes" element={<ClassesScreen />} />
        <Route path="/stars" element={<StarsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/booking" element={<BookingScreen />} />
      </Routes>
    </Router>
  );
}
