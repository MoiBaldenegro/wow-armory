import type { InvalidSearchInput } from '../../application/character/SearchCharacter';

export function searchErrorMessage(error: InvalidSearchInput): string {
  if (error.field === 'query') {
    return 'Usa el formato reino/nombre, por ejemplo grobbulus/billiemoi.';
  }

  if (error.field === 'realm') {
    return error.reason === 'empty'
      ? 'Escribe el reino.'
      : 'El reino solo puede tener letras sin acentos, números, espacios, guiones y apóstrofos.';
  }

  return error.reason === 'empty'
    ? 'Escribe el nombre del personaje.'
    : 'El nombre solo puede tener letras sin acentos, números, guiones y apóstrofos, sin espacios.';
}
