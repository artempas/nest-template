import { UserDomainErrorCodes } from './users';

// коды общих ошибок (см. docs/Ошибки.md > Общие доменные ошибки) перечисляются здесь же
export type DomainErrorCodes = 'ACCESS_DENIED' | UserDomainErrorCodes;
