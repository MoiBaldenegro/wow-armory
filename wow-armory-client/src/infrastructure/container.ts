import { CheckSession } from '../application/auth/CheckSession';
import { Logout } from '../application/auth/Logout';
import { StartLogin } from '../application/auth/StartLogin';
import { GetCharacter } from '../application/character/GetCharacter';
import { getServerUri } from './config/env';
import { AxiosHttpClient } from './http/AxiosHttpClient';
import { HttpAuthRepository } from './http/HttpAuthRepository';
import { HttpCharacterRepository } from './http/HttpCharacterRepository';

export interface UseCases {
  getCharacter: GetCharacter;
  checkSession: CheckSession;
  startLogin: StartLogin;
  logout: Logout;
}

export function createUseCases(): UseCases {
  const httpClient = new AxiosHttpClient(getServerUri());
  const characterRepository = new HttpCharacterRepository(httpClient);
  const authRepository = new HttpAuthRepository(httpClient);

  return {
    getCharacter: new GetCharacter(characterRepository),
    checkSession: new CheckSession(authRepository),
    startLogin: new StartLogin(authRepository),
    logout: new Logout(authRepository),
  };
}
