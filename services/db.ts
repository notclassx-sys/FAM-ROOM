
import { supabase } from './supabase';
import { 
  User, FamilyRoom, Medicine, EmergencyLog, 
  ChatMessage, UserRole, Alert, UserRoomMembership, CheckInLog 
} from '../types';

const mapRoom = (data: any): FamilyRoom | null => {
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    joinCode: data.join_code,
    adminUserId: data.admin_user_id,
    createdAt: data.created_at
  };
};

export const Db = {
  // --- User Operations ---
  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      const memberships = await Db.getUserMemberships(data.id);
      
      return {
        id: data.id,
        phoneNumber: data.phone_number,
        username: data.username,
        language: data.language,
        activeRoomId: data.active_room_id,
        lastSeen: data.last_seen,
        joinedRooms: memberships
      } as User;
    } catch (err) {
      console.error("DB Error (getUserById):", err);
      return null;
    }
  },

  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      const memberships = await Db.getUserMemberships(data.id);
      
      return {
        id: data.id,
        phoneNumber: data.phone_number,
        username: data.username,
        language: data.language,
        activeRoomId: data.active_room_id,
        lastSeen: data.last_seen,
        joinedRooms: memberships
      } as User;
    } catch (err) {
      console.error("DB Error (getUserByPhone):", err);
      return null;
    }
  },

  async createUser(user: User): Promise<void> {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        phone_number: user.phoneNumber,
        username: user.username,
        language: user.language,
        last_seen: Date.now()
      });
    if (error) console.error("Error creating/updating user:", error);
  },

  async updateUserActiveRoom(userId: string, roomId: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ active_room_id: roomId })
      .eq('id', userId);
    if (error) console.error("Error updating active room:", error);
  },

  async updateLastSeen(userId: string): Promise<void> {
    await supabase
      .from('users')
      .update({ last_seen: Date.now() })
      .eq('id', userId);
  },

  // --- Room & Membership Operations ---
  async createRoom(room: FamilyRoom, userId: string): Promise<void> {
    const { error: roomError } = await supabase.from('family_rooms').insert({
      id: room.id,
      name: room.name,
      join_code: room.joinCode,
      admin_user_id: room.adminUserId,
      created_at: room.createdAt
    });
    if (roomError) throw roomError;

    const { error: memberError } = await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: userId,
      role: UserRole.ADMIN
    });
    if (memberError) throw memberError;
  },

  async joinRoom(roomCode: string, userId: string, role: UserRole): Promise<FamilyRoom | null> {
    const room = await Db.getRoomByCode(roomCode);
    if (!room) return null;

    const { data: existing } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return room;

    const { error } = await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: userId,
      role: role
    });
    if (error) throw error;

    return room;
  },

  async getUserMemberships(userId: string): Promise<UserRoomMembership[]> {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        id,
        role,
        room_id,
        family_rooms (
          name
        )
      `)
      .eq('user_id', userId);

    if (error) return [];
    
    return (data || []).map((m: any) => ({
      id: m.id,
      roomId: m.room_id,
      userId: userId,
      role: m.role as UserRole,
      roomName: m.family_rooms?.name
    }));
  },

  async getRoomMembers(roomId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        role,
        users (
          id,
          phone_number,
          username,
          language,
          last_seen
        )
      `)
      .eq('room_id', roomId);

    if (error) return [];
    
    return (data || []).map((m: any) => ({
      id: m.users.id,
      phoneNumber: m.users.phone_number,
      username: m.users.username,
      language: m.users.language,
      lastSeen: m.users.last_seen,
      role: m.role,
      joinedRooms: []
    } as any));
  },

  async getRoomByCode(code: string): Promise<FamilyRoom | null> {
    const { data, error } = await supabase
      .from('family_rooms')
      .select('*')
      .eq('join_code', code.toUpperCase())
      .maybeSingle();
    if (error) return null;
    return mapRoom(data);
  },

  async getRoomById(id: string): Promise<FamilyRoom | null> {
    const { data, error } = await supabase
      .from('family_rooms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return mapRoom(data);
  },

  // --- Medicine Operations ---
  async getMeds(roomId: string): Promise<Medicine[]> {
    const { data } = await supabase
      .from('medicines')
      .select('*')
      .eq('family_room_id', roomId);
    
    return (data || []).map(m => ({
      id: m.id,
      familyRoomId: m.family_room_id,
      elderUserId: m.elder_user_id,
      medicineName: m.medicine_name,
      timings: m.timings,
      daysOfWeek: m.days_of_week,
      notes: m.notes,
      takenToday: m.taken_today
    }));
  },

  async saveMed(med: Medicine): Promise<void> {
    const { error } = await supabase.from('medicines').insert({
      id: med.id,
      family_room_id: med.familyRoomId,
      elder_user_id: med.elderUserId,
      medicine_name: med.medicineName,
      timings: med.timings,
      days_of_week: med.daysOfWeek,
      notes: med.notes,
      taken_today: false
    });
    if (error) console.error("Med save error:", error);
  },

  async deleteMed(id: string): Promise<void> {
    await supabase.from('medicines').delete().eq('id', id);
  },

  async toggleMed(id: string, status: boolean): Promise<void> {
    await supabase.from('medicines').update({ taken_today: status }).eq('id', id);
  },

  // --- Check-ins ---
  async logCheckIn(userId: string, roomId: string, message: string): Promise<void> {
    await supabase.from('checkin_logs').insert({
      id: 'chk-' + Date.now(),
      elder_user_id: userId,
      family_room_id: roomId,
      timestamp: Date.now(),
      message: message
    });
  },

  async getCheckInHistory(roomId: string): Promise<CheckInLog[]> {
    const { data } = await supabase
      .from('checkin_logs')
      .select('*')
      .eq('family_room_id', roomId)
      .order('timestamp', { ascending: false });
    return (data || []).map(l => ({
      id: l.id,
      elderUserId: l.elder_user_id,
      timestamp: l.timestamp,
      message: l.message
    }));
  },

  // --- Alerts & SOS ---
  async getAlerts(roomId: string): Promise<Alert[]> {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('family_room_id', roomId)
      .eq('status', 'active');
    return (data || []) as Alert[];
  },

  async triggerSOS(alert: Alert, roomId: string): Promise<void> {
    await supabase.from('alerts').insert({
      id: alert.id,
      family_room_id: roomId,
      type: alert.type,
      from_user_id: alert.fromUserId,
      from_username: alert.fromUsername,
      message: alert.message,
      timestamp: alert.timestamp,
      status: alert.status
    });
    
    await supabase.from('sos_logs').insert({
      id: alert.id,
      elder_user_id: alert.fromUserId,
      family_room_id: roomId,
      timestamp: alert.timestamp,
      resolved_status: false,
      message: alert.message
    });
  },

  async resolveAlert(id: string): Promise<void> {
    await supabase.from('alerts').update({ status: 'resolved' }).eq('id', id);
    await supabase.from('sos_logs').update({ resolved_status: true }).eq('id', id);
  },

  async getSOSHistory(roomId: string): Promise<EmergencyLog[]> {
    const { data } = await supabase
      .from('sos_logs')
      .select('*')
      .eq('family_room_id', roomId)
      .order('timestamp', { ascending: false });
    return (data || []).map(l => ({
      id: l.id,
      elderUserId: l.elder_user_id,
      timestamp: l.timestamp,
      resolvedStatus: l.resolved_status,
      message: l.message
    }));
  },

  // --- Chat ---
  async getChat(roomId: string): Promise<ChatMessage[]> {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('family_room_id', roomId)
      .order('timestamp', { ascending: true })
      .limit(100);
    return (data || []) as ChatMessage[];
  },

  async sendChatMessage(msg: ChatMessage): Promise<void> {
    await supabase.from('chat_messages').insert({
      id: msg.id,
      family_room_id: msg.familyRoomId,
      user_id: msg.userId,
      username: msg.username,
      role: msg.role,
      message: msg.message,
      timestamp: msg.timestamp
    });
  }
};
