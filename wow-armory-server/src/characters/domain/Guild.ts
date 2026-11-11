import { CharacterError } from './errors/CharacterError';

export interface GuildProps {
  name: string;
  realm?: string;
  realmSlug?: string;
  rank?: number;
  memberCount?: number;
}

export class Guild {
  private constructor(private readonly props: GuildProps) {}

  static create(props: GuildProps): Guild {
    if (typeof props.name !== 'string' || props.name.trim().length === 0) {
      throw new CharacterError('The guild name is invalid.');
    }

    return new Guild({
      name: props.name,
      realm: props.realm,
      realmSlug: props.realmSlug,
      rank: props.rank,
      memberCount: props.memberCount,
    });
  }

  get name(): string {
    return this.props.name;
  }

  get realm(): string | undefined {
    return this.props.realm;
  }

  get realmSlug(): string | undefined {
    return this.props.realmSlug;
  }

  get rank(): number | undefined {
    return this.props.rank;
  }

  get memberCount(): number | undefined {
    return this.props.memberCount;
  }
}
