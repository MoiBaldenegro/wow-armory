import React, { useEffect, useState } from 'react';
import { CharacterCard } from './components/CharacterCard';
import { CharacterBanner } from './components/CharacterBanner';
import { RecentAchievements } from './components/RecentAchievements';
import { ThemeToggle } from './components/ThemeToggle';
import { Header } from './components/Header/Header';
import { Footer } from './components/Footer';
import { mockCharacter } from './data/mockCharacter';
import useDetail from './hooks/useDetails';
import { useAuth } from './hooks/useAuth';
import { use } from 'framer-motion/client';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };
  const URI = import.meta.env.VITE_SERVER_URI;
  const {data} = useDetail(`${URI}/auth/character/grobbulus/billiemoi`);
  const {isAuthenticated} = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('not authenticated')
      return
    }
    console.log(data)
  }, [data, isAuthenticated])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-100'
    }`}>
      <Header />
      <ThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
      <div className="container mx-auto px-4 py-8 pt-24">
        <CharacterBanner character={mockCharacter} />
        <RecentAchievements achievements={mockCharacter.recentAchievements} />
        <CharacterCard character={mockCharacter} />
      </div>
      <Footer />
    </div>
  );
}

export default App;