import { AuthErrorBanner } from '../components/AuthErrorBanner';
import { CharacterBanner } from '../components/CharacterBanner';
import { CharacterCard } from '../components/CharacterCard';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header/Header';
import { RecentAchievements } from '../components/RecentAchievements';
import { ThemeToggle } from '../components/ThemeToggle';
import { mockCharacter } from '../data/mockCharacter';

export function HomePage() {
  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-gray-900">
      <Header />
      <ThemeToggle />
      <div className="container mx-auto px-4 py-8 pt-24">
        <AuthErrorBanner />
        <CharacterBanner character={mockCharacter} />
        <RecentAchievements
          achievements={mockCharacter.recentAchievements}
        />
        <CharacterCard character={mockCharacter} />
      </div>
      <Footer />
    </div>
  );
}
