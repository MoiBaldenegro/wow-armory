import { Github, Heart, Linkedin, Twitter } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-12 bg-gray-950 py-10 text-white"
    >
      <div className="container mx-auto w-full max-w-7xl px-4">
        <div className="mb-8 grid min-w-0 grid-cols-1 gap-8 md:grid-cols-3">
          <div className="min-w-0">
            <h3 className="mb-4 text-xl font-bold">WoW Armory</h3>
            <p className="max-w-sm text-gray-400">
              Consulta personajes, logros y progreso de World of Warcraft.
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="mb-4 text-xl font-bold">Navegación</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/" className="transition-colors hover:text-white">Inicio</Link></li>
              <li><Link to="/guide" className="transition-colors hover:text-white">Guía de Armory</Link></li>
              <li><Link to="/profile" className="transition-colors hover:text-white">Mi perfil</Link></li>
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="mb-4 text-xl font-bold">Conecta</h3>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <p className="mb-0 text-sm text-gray-400">
              © {currentYear} WoW Armory. All rights reserved.
            </p>
            <p className="flex items-center gap-2 text-sm text-gray-400">
              Made with <Heart className="w-4 h-4 text-red-500" /> by{' '}
              <span className="font-semibold">Moi Baldenegro</span>
            </p>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}