import { useParams, useSearchParams } from 'react-router-dom';
import { CharacterProfileContent } from '../components/character/CharacterProfileContent';
import { PageShell } from '../components/layout/PageShell';
import { useCharacter } from '../hooks/useCharacter';
import { useCharacterDetails } from '../hooks/useCharacterDetails';

export function CharacterProfilePage() {
  const { realmSlug = '', characterName = '' } = useParams<{
    realmSlug: string;
    characterName: string;
  }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'retail' ? 'retail' : 'classic';
  const { state, retry } = useCharacter(realmSlug, characterName, mode);
  const details = useCharacterDetails(realmSlug, characterName, mode);

  return (
    <PageShell>
      <CharacterProfileContent
        key={`${realmSlug}/${characterName}/${mode}`}
        state={state}
        realmSlug={realmSlug}
        characterName={characterName}
        retry={retry}
        details={details}
        mode={mode}
      />
    </PageShell>
  );
}
