export interface Player {
  userId: string;
  displayName: string | null;
  points: number;
  level: number;
  updatedAt: Date;
}

export interface UserAccount {
  userId: string;
  email: string | null;
  createdAt: Date;
}

export interface CombatResult {
  damage: number;
  isCritical: boolean;
  remainingHp: number;
}
