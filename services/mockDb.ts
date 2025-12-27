
import { 
  User, FamilyRoom, Medicine, CheckInLog, 
  EmergencyLog, ChatMessage, UserRole, Alert, UserRoomMembership 
} from '../types';

const STORAGE_KEYS = {
  SESSION_USER: 'famroom_session_user',
  REGISTERED_USERS: 'famroom_cloud_users',
  ROOMS: 'famroom_rooms',
  MEDS: 'famroom_meds',
  LOGS_CHECKIN: 'famroom_checkin_logs',
  LOGS_SOS: 'famroom_sos_logs',
  CHAT: 'famroom_chat',
  ALERTS: 'famroom_alerts'
};

const get = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const set = <T,>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const MockDb = {
  // Session Management
  getCurrentSessionUser: () => get<User | null>(STORAGE_KEYS.SESSION_USER, null),
  setCurrentSessionUser: (user: User | null) => set(STORAGE_KEYS.SESSION_USER, user),

  // User Registry
  getRegisteredUsers: () => get<User[]>(STORAGE_KEYS.REGISTERED_USERS, []),
  findUserByPhone: (phone: string) => {
    const users = MockDb.getRegisteredUsers();
    return users.find(u => u.phoneNumber === phone) || null;
  },
  saveUserToRegistry: (user: User) => {
    const users = MockDb.getRegisteredUsers();
    const index = users.findIndex(u => u.phoneNumber === user.phoneNumber);
    if (index > -1) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    set(STORAGE_KEYS.REGISTERED_USERS, users);
  },

  updateUserActivity: (userId: string) => {
    const users = MockDb.getRegisteredUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index > -1) {
      users[index].lastSeen = Date.now();
      set(STORAGE_KEYS.REGISTERED_USERS, users);
      const session = MockDb.getCurrentSessionUser();
      if (session && session.id === userId) {
        session.lastSeen = users[index].lastSeen;
        MockDb.setCurrentSessionUser(session);
      }
    }
  },

  getRoomMembers: (roomId: string) => {
    const users = MockDb.getRegisteredUsers();
    return users.filter(u => u.joinedRooms.some(r => r.roomId === roomId));
  },

  // Room Management
  getRooms: () => get<FamilyRoom[]>(STORAGE_KEYS.ROOMS, []),
  getRoomById: (id: string) => MockDb.getRooms().find(r => r.id === id),
  addRoom: (room: FamilyRoom) => {
    const rooms = MockDb.getRooms();
    set(STORAGE_KEYS.ROOMS, [...rooms, room]);
  },
  findRoomByCode: (code: string) => {
    const rooms = MockDb.getRooms();
    return rooms.find(r => r.joinCode === code.toUpperCase()) || null;
  },

  // Alerts Management
  getAlerts: (roomId: string) => {
    const all = get<Alert[]>(STORAGE_KEYS.ALERTS, []);
    return all.filter(a => a.status === 'active');
  },
  addAlert: (alert: Alert) => {
    const all = get<Alert[]>(STORAGE_KEYS.ALERTS, []);
    set(STORAGE_KEYS.ALERTS, [...all, alert]);
  },
  resolveAlert: (alertId: string) => {
    const all = get<Alert[]>(STORAGE_KEYS.ALERTS, []);
    set(STORAGE_KEYS.ALERTS, all.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
    
    // Also resolve corresponding SOS log if it exists
    const sosLogs = get<EmergencyLog[]>(STORAGE_KEYS.LOGS_SOS, []);
    set(STORAGE_KEYS.LOGS_SOS, sosLogs.map(s => s.id === alertId ? { ...s, resolvedStatus: true } : s));
  },

  // Medicine Data
  getMeds: (roomId: string) => get<Medicine[]>(STORAGE_KEYS.MEDS, []).filter(m => m.familyRoomId === roomId),
  saveMed: (med: Medicine) => {
    const all = get<Medicine[]>(STORAGE_KEYS.MEDS, []);
    set(STORAGE_KEYS.MEDS, [...all, med]);
  },
  deleteMed: (medId: string) => {
    const all = get<Medicine[]>(STORAGE_KEYS.MEDS, []);
    set(STORAGE_KEYS.MEDS, all.filter(m => m.id !== medId));
  },
  toggleMedStatus: (medId: string) => {
    const all = get<Medicine[]>(STORAGE_KEYS.MEDS, []);
    const updated = all.map(m => m.id === medId ? { ...m, takenToday: !m.takenToday } : m);
    set(STORAGE_KEYS.MEDS, updated);
  },

  // History & Logs
  getSOSLogs: () => get<EmergencyLog[]>(STORAGE_KEYS.LOGS_SOS, []),
  addSOS: (log: EmergencyLog) => {
    const all = get<EmergencyLog[]>(STORAGE_KEYS.LOGS_SOS, []);
    set(STORAGE_KEYS.LOGS_SOS, [log, ...all]);
  },
  addCheckIn: (log: CheckInLog) => {
    const all = get<CheckInLog[]>(STORAGE_KEYS.LOGS_CHECKIN, []);
    set(STORAGE_KEYS.LOGS_CHECKIN, [log, ...all]);
  },
  getCheckIns: (userId: string) => get<CheckInLog[]>(STORAGE_KEYS.LOGS_CHECKIN, []).filter(l => l.elderUserId === userId),

  // Chat
  getChat: (roomId: string) => get<ChatMessage[]>(STORAGE_KEYS.CHAT, []).filter(c => c.familyRoomId === roomId),
  addChatMessage: (msg: ChatMessage) => {
    const all = get<ChatMessage[]>(STORAGE_KEYS.CHAT, []);
    set(STORAGE_KEYS.CHAT, [...all, msg]);
  }
};
