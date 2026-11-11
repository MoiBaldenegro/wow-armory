import type { Achievement } from '../../../domain/character/Achievement';
import { formatDate, formatNumber } from '../../utils/characterFormat';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

interface RecentAchievementsProps {
  achievements?: Achievement[];
}

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  const items = achievements ?? [];

  return (
    <section className="mx-card" aria-labelledby="recent-achievements-title">
      <SectionHeading id="recent-achievements-title" icon="trophy">
        Logros recientes
      </SectionHeading>
      {items.length === 0 ? (
        <p className="mx-text mx-text--secondary achievements-empty">
          Sin logros recientes
        </p>
      ) : (
        <ul className="achievement-list">
          {items.map((achievement, index) => {
            const completedAt = formatDate(achievement.completedAt);

            return (
              <li
                key={
                  achievement.id !== undefined
                    ? `id-${achievement.id}`
                    : `${achievement.name}-${index}`
                }
                className="achievement-item"
              >
                <div className="achievement-icon">
                  {achievement.iconUrl ? (
                    <img src={achievement.iconUrl} alt="" loading="lazy" />
                  ) : achievement.points !== undefined ? (
                    <span>
                      {formatNumber(achievement.points)}
                      <span className="mx-visually-hidden"> puntos</span>
                    </span>
                  ) : (
                    <Icon name="trophy" size={20} />
                  )}
                </div>
                <div className="achievement-body">
                  <h3>{achievement.name}</h3>
                </div>
                {completedAt !== undefined && (
                  <p className="achievement-date">
                    <span className="mx-visually-hidden">Completado el </span>
                    {completedAt}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
