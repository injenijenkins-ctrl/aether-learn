/*
-- Run in Supabase SQL Editor:
-- CREATE TABLE study_rooms (id TEXT PRIMARY KEY, host_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, invite_code TEXT UNIQUE NOT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
-- CREATE TABLE room_members (id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE, user_id TEXT NOT NULL, joined_at TIMESTAMPTZ DEFAULT NOW());
-- CREATE TABLE room_messages (id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
*/

import { nanoid } from 'nanoid';
import { getSupabase } from './supabase';

export type StudyRoom = {
  id: string;
  host_id: string;
  name: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
};

export type RoomMember = {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type RoomMessage = {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
  userName?: string | null;
  userImage?: string | null;
};

export type RoomSummary = StudyRoom & {
  hostName: string;
  memberCount: number;
};

const SELECT_ROOM = 'id, host_id, name, invite_code, is_active, created_at';

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

function displayName(profile?: UserProfile | null, fallback = 'Learner') {
  return profile?.name || profile?.email || fallback;
}

async function getUserProfiles(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, UserProfile>();

  const { data } = await getSupabase()
    .from('users')
    .select('id, name, email, image')
    .in('id', uniqueIds);

  return new Map((data || []).map((user) => [user.id, user as UserProfile]));
}

async function roomSummaries(rooms: StudyRoom[]): Promise<RoomSummary[]> {
  if (rooms.length === 0) return [];

  const roomIds = rooms.map((room) => room.id);
  const profiles = await getUserProfiles(rooms.map((room) => room.host_id));
  const { data: memberRows } = await getSupabase()
    .from('room_members')
    .select('room_id')
    .in('room_id', roomIds);

  const memberCounts = new Map<string, number>();
  for (const row of memberRows || []) {
    memberCounts.set(row.room_id, (memberCounts.get(row.room_id) || 0) + 1);
  }

  return rooms.map((room) => ({
    ...room,
    hostName: displayName(profiles.get(room.host_id), 'Host'),
    memberCount: memberCounts.get(room.id) || 0,
  }));
}

export async function createRoom(hostId: string, name: string): Promise<StudyRoom> {
  const now = new Date().toISOString();
  const room: StudyRoom = {
    id: nanoid(),
    host_id: hostId,
    name: name.trim(),
    invite_code: nanoid(6).toUpperCase(),
    is_active: true,
    created_at: now,
  };

  const { data, error } = await getSupabase()
    .from('study_rooms')
    .insert(room)
    .select(SELECT_ROOM)
    .single();

  if (error) throw new Error(error.message);

  await getSupabase().from('room_members').insert({
    id: nanoid(),
    room_id: room.id,
    user_id: hostId,
    joined_at: now,
  });

  return data as StudyRoom;
}

export async function joinRoom(inviteCode: string, userId: string): Promise<StudyRoom> {
  const { data: room, error } = await getSupabase()
    .from('study_rooms')
    .select(SELECT_ROOM)
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!room) throw new Error('Room not found');

  const { data: existing } = await getSupabase()
    .from('room_members')
    .select('id')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await getSupabase().from('room_members').insert({
      id: nanoid(),
      room_id: room.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
    });

    if (memberError) throw new Error(memberError.message);
  }

  return room as StudyRoom;
}

export async function getRoomMessages(roomId: string): Promise<RoomMessage[]> {
  const { data, error } = await getSupabase()
    .from('room_messages')
    .select('id, room_id, user_id, role, content, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const profiles = await getUserProfiles((data || []).map((message) => message.user_id));
  return (data || []).map((message) => {
    const profile = profiles.get(message.user_id);
    return {
      ...(message as RoomMessage),
      userName: message.role === 'assistant' ? 'AetherLearn' : displayName(profile),
      userImage: profile?.image || null,
    };
  });
}

export async function addMessage(
  roomId: string,
  userId: string,
  role: string,
  content: string
): Promise<RoomMessage> {
  const { data, error } = await getSupabase()
    .from('room_messages')
    .insert({
      id: nanoid(),
      room_id: roomId,
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString(),
    })
    .select('id, room_id, user_id, role, content, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as RoomMessage;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await getSupabase()
    .from('room_members')
    .select('id, room_id, user_id, joined_at')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  const profiles = await getUserProfiles((data || []).map((member) => member.user_id));
  return (data || []).map((member) => {
    const profile = profiles.get(member.user_id);
    return {
      ...(member as RoomMember),
      name: displayName(profile),
      email: profile?.email || null,
      image: profile?.image || null,
    };
  });
}

export async function getRoomById(roomId: string): Promise<StudyRoom | null> {
  const { data, error } = await getSupabase()
    .from('study_rooms')
    .select(SELECT_ROOM)
    .eq('id', roomId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as StudyRoom | null) || null;
}

export async function userCanAccessRoom(roomId: string, userId: string): Promise<boolean> {
  const room = await getRoomById(roomId);
  if (!room) return false;
  if (room.host_id === userId) return true;

  const { data } = await getSupabase()
    .from('room_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data);
}

export async function getRoomsForUser(userId: string): Promise<RoomSummary[]> {
  const supabase = getSupabase();

  const [{ data: hosted, error: hostedError }, { data: memberships, error: memberError }] =
    await Promise.all([
      supabase
        .from('study_rooms')
        .select(SELECT_ROOM)
        .eq('host_id', userId)
        .eq('is_active', true),
      supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId),
    ]);

  if (hostedError) throw new Error(hostedError.message);
  if (memberError) throw new Error(memberError.message);

  const memberRoomIds = Array.from(new Set((memberships || []).map((row) => row.room_id)));
  let joined: StudyRoom[] = [];

  if (memberRoomIds.length > 0) {
    const { data, error } = await supabase
      .from('study_rooms')
      .select(SELECT_ROOM)
      .in('id', memberRoomIds)
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    joined = (data || []) as StudyRoom[];
  }

  const byId = new Map<string, StudyRoom>();
  for (const room of [...((hosted || []) as StudyRoom[]), ...joined]) {
    byId.set(room.id, room);
  }

  return roomSummaries(
    Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );
}
