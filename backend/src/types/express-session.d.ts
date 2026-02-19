import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    isRegistered: boolean;
    currentAreaId: number;
  }
}
