import { CheckSession } from '../application/auth/CheckSession';
import { Logout } from '../application/auth/Logout';
import { StartLogin } from '../application/auth/StartLogin';
import { GetCharacter } from '../application/character/GetCharacter';
import { getServerUri } from './config/env';
import { AxiosHttpClient } from './http/AxiosHttpClient';
import { HttpAuthRepository } from './http/HttpAuthRepository';
import { HttpCharacterRepository } from './http/HttpCharacterRepository';
import { HttpCharacterDetailsRepository } from './http/HttpCharacterDetailsRepository';
import { HttpWowProfileRepository } from './http/HttpWowProfileRepository';
import { GetWowProfile } from '../application/profile/GetWowProfile';
import { GetCharacterDetails } from '../application/character/GetCharacterDetails';
import { ArmoryQueries } from '../application/armory/ArmoryQueries';
import { HttpArmoryRepository } from './http/HttpArmoryRepository';

export interface UseCases {
  getCharacter: GetCharacter;
  checkSession: CheckSession;
  startLogin: StartLogin;
  logout: Logout;
  getWowProfile?: GetWowProfile;
  getCharacterDetails?: GetCharacterDetails;
  /** Optional so tests can omit it; sections then stay hidden. */
  armory?: ArmoryQueries;
}

export function createUseCases(): UseCases {
  const httpClient = new AxiosHttpClient(getServerUri());
  const characterRepository = new HttpCharacterRepository(httpClient);
  const characterDetailsRepository = new HttpCharacterDetailsRepository(httpClient);
  const authRepository = new HttpAuthRepository(httpClient);
  const wowProfileRepository = new HttpWowProfileRepository(httpClient);

  return {
    getCharacter: new GetCharacter(characterRepository),
    checkSession: new CheckSession(authRepository),
    startLogin: new StartLogin(authRepository),
    logout: new Logout(authRepository),
    getWowProfile: new GetWowProfile(wowProfileRepository),
    getCharacterDetails: new GetCharacterDetails(characterDetailsRepository),
    armory: new ArmoryQueries(new HttpArmoryRepository(httpClient)),
  };
}
