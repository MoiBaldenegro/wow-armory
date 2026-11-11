import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { WOW_MODES, parseWowMode } from '../../domain/armory/Armory';
import { CharacterProfileContent } from '../components/character/CharacterProfileContent';
import { GameSwitch } from '../components/character/GameSwitch';
import { PageShell } from '../components/layout/PageShell';
import { useCharacter, type CharacterState } from '../hooks/useCharacter';
import { useCharacterDetails } from '../hooks/useCharacterDetails';

/** Marks a URL whose game was picked by the automatic lookup, not by the user. */
const AUTO_PARAM = 'auto';

export function CharacterProfilePage() {
  const { realmSlug = '', characterName = '' } = useParams<{
    realmSlug: string;
    characterName: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const explicitMode = parseWowMode(searchParams.get('mode'));
  const mode = explicitMode ?? 'classic';
  const { state, retry } = useCharacter(realmSlug, characterName, mode);
  const details = useCharacterDetails(realmSlug, characterName, mode);

  // Links without a game (the header quick search) look in every catalog in
  // order: Classic, Anniversary, Era and Retail. The lookup stops at the first
  // game that has the character and only reports "not found" after the last.
  const isAutomatic = explicitMode === null || searchParams.has(AUTO_PARAM);
  const nextMode = WOW_MODES[WOW_MODES.indexOf(mode) + 1];
  const triesNextGame =
    isAutomatic && state.status === 'not-found' && nextMode !== undefined;

  useEffect(() => {
    if (triesNextGame) {
      setSearchParams({ mode: nextMode, [AUTO_PARAM]: '1' }, { replace: true });
    }
  }, [nextMode, setSearchParams, triesNextGame]);

  const shownState: CharacterState = triesNextGame
    ? { status: 'loading' }
    : state;

  return (
    <PageShell>
      <GameSwitch
        mode={mode}
        onChange={(next) => setSearchParams({ mode: next })}
      />
      <CharacterProfileContent
        key={`${realmSlug}/${characterName}/${mode}`}
        state={shownState}
        realmSlug={realmSlug}
        characterName={characterName}
        retry={retry}
        details={details}
        mode={mode}
      />
    </PageShell>
  );
}
