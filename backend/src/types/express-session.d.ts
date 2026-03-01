import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: number;
    isRegistered: boolean;
    currentAreaId: number;
  }
}
