import type { CSSProperties } from 'react';
import type { GuildCrest as Crest } from '../../../domain/armory/Armory';

/**
 * Blizzard crest media are white masks; each layer is tinted with the guild
 * colors through `mask-image` over a colored background.
 */
export function GuildCrest({ crest, name }: { crest?: Crest; name: string }) {
  const layer = (url: string | undefined, color: string | undefined): CSSProperties | undefined =>
    url
      ? {
          backgroundColor: color ?? 'currentColor',
          WebkitMaskImage: `url("${url}")`,
          maskImage: `url("${url}")`,
        }
      : undefined;
  const emblem = layer(crest?.emblemUrl, crest?.emblemColor);
  const border = layer(crest?.borderUrl, crest?.borderColor);

  return (
    <div
      className="guild-crest"
      role="img"
      aria-label={`Escudo de ${name}`}
      style={{ backgroundColor: crest?.backgroundColor }}
    >
      {emblem ? (
        <span className="guild-crest-layer" style={emblem} />
      ) : (
        <span className="guild-crest-initial" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {border && <span className="guild-crest-layer" style={border} />}
    </div>
  );
}
