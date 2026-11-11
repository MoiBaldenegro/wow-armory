import { WOW_MODES, type WowMode } from '../../../domain/armory/Armory';
import { gameLabel } from '../../utils/armoryFormat';

interface GameSwitchProps {
  mode: WowMode;
  onChange: (mode: WowMode) => void;
}

/** Each game is a separate catalog: the same name can be a different character in each. */
export function GameSwitch({ mode, onChange }: GameSwitchProps) {
  return (
    <div className="game-switch">
      <span className="mx-field__label" aria-hidden="true">
        Juego
      </span>
      <div className="mx-segmented" role="group" aria-label="Juego">
        {WOW_MODES.map((game) => (
          <button
            key={game}
            type="button"
            className="mx-segmented__option"
            aria-pressed={game === mode}
            onClick={() => onChange(game)}
          >
            {gameLabel(game)}
          </button>
        ))}
      </div>
    </div>
  );
}
