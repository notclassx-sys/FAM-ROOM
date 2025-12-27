
export enum Language {
  EN = 'English',
  HI = 'Hindi'
}

export enum UserRole {
  ADMIN = 'Admin',
  YOUNG = 'Young',
  ELDER = 'Elder'
}

export interface UserRoomMembership {
  id?: string;
  roomId: string;
  userId: string;
  role: UserRole;
  roomName?: string; // Joined for convenience
}

export interface User {
  id: string;
  phoneNumber: string;
  username: string;
  language: Language;
  activeRoomId?: string;
  lastSeen?: number;
  // Added to fix property missing error in mockDb and components
  joinedRooms: UserRoomMembership[];
}

export interface FamilyRoom {
  id: string;
  name: string;
  joinCode: string;
  adminUserId: string;
  createdAt: number;
}

export interface Medicine {
  id: string;
  familyRoomId: string;
  elderUserId: string;
  medicineName: string;
  timings: string[];
  daysOfWeek: string[];
  notes: string;
  takenToday?: boolean;
}

export interface Alert {
  id: string;
  type: 'SOS' | 'MED_MISSED';
  fromUserId: string;
  fromUsername: string;
  message: string;
  timestamp: number;
  callTriggeredAt: number;
  isCallActive: boolean;
  status: 'active' | 'resolved';
}

export interface EmergencyLog {
  id: string;
  elderUserId: string;
  timestamp: number;
  location?: { lat: number; lng: number };
  resolvedStatus: boolean;
  message?: string;
}

// Added to fix missing export error in mockDb
export interface CheckInLog {
  id: string;
  elderUserId: string;
  timestamp: number;
  message?: string;
}

export interface ChatMessage {
  id: string;
  familyRoomId: string;
  userId: string;
  username: string;
  role: UserRole;
  message: string;
  timestamp: number;
}
