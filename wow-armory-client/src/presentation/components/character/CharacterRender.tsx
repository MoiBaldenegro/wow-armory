interface CharacterRenderProps {
  url: string;
  name: string;
}

export function CharacterRender({ url, name }: CharacterRenderProps) {
  return (
    <figure className="character-render fade-in">
      <img src={url} alt={`Render de ${name}`} loading="eager" />
    </figure>
  );
}
