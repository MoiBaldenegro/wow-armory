import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';

export function Header() {
  const [isCompact, setIsCompact] = useState(false);
  const { scrollY } = useScroll();
  
  const headerBackground = useTransform(
    scrollY,
    [0, 50],
    ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)']
  );

  const headerPadding = useTransform(
    scrollY,
    [0, 50],
    ['1.5rem', '0.75rem']
  );

  useEffect(() => {
    const updateCompactState = () => {
      setIsCompact(window.scrollY > 50);
    };

    window.addEventListener('scroll', updateCompactState);
    return () => window.removeEventListener('scroll', updateCompactState);
  }, []);

  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
    // Implement search logic here
  };
  const login = async () => {
    try {
      // Llamamos al endpoint /auth/login de nuestro backend
      const response = await fetch('https://wow-armory.onrender.com/auth/login');
      
      if (response.ok) {
        const data = await response.json();
        
        // Si obtenemos la URL de autorización de Blizzard, redirigimos al usuario
        if (data.url) {
          window.location.href = data.url;  // Redirige al usuario a Blizzard para autorizar
        }
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  };

  return (
    <motion.header
      style={{
        background: headerBackground,
        padding: headerPadding,
      }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4">
        <button className="flex items-center gap-2 text-white" onClick={login}>Iniciar session</button>
        <div className="flex items-center justify-between gap-8">
          <Logo isCompact={isCompact} />
          <SearchBar isCompact={isCompact} onSearch={handleSearch} />
        </div>
      </div>
    </motion.header>
  );
}