import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { minimalNotificationPayload } from './realIntegrations';

export type NativeCapability = 'notifications' | 'calendar' | 'speech';
export type NativeCapabilityStatus = 'available' | 'requires_permission' | 'web_preview' | 'unavailable';

export function nativeCapabilityStatus(capability: NativeCapability): NativeCapabilityStatus {
  if (Platform.OS === 'web') return 'web_preview';
  if (capability === 'speech') return 'available';
  return 'requires_permission';
}

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  if (!permission.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('documenta-local', { name: 'Documenta', importance: Notifications.AndroidImportance.DEFAULT });
  }
  return true;
}

export async function scheduleLocalNotification(input: { id?: string; title: string; body: string; scheduledFor: string; target?: string; privateMode?: boolean }): Promise<string | undefined> {
  if (Platform.OS === 'web' || !(await requestLocalNotificationPermission())) return undefined;
  const timestamp = Date.parse(input.scheduledFor);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return undefined;
  const payload = minimalNotificationPayload(input);
  return Notifications.scheduleNotificationAsync({
    identifier: input.id,
    content: { title: payload.title, body: payload.body, data: payload.data, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(timestamp) },
  });
}

export async function cancelLocalNotification(identifier: string): Promise<void> {
  if (Platform.OS !== 'web') await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function readDeviceCalendars(): Promise<Calendar.Calendar[]> {
  if (Platform.OS === 'web') return [];
  const permission = await Calendar.getCalendarPermissionsAsync();
  if (!permission.granted) return [];
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

export async function requestAndReadDeviceCalendars(): Promise<Calendar.Calendar[]> {
  if (Platform.OS === 'web') return [];
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) return [];
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

export async function createDeviceCalendarEvent(input: { calendarId: string; title: string; startAt: string; endAt?: string; timezone?: string; notes?: string }): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) return undefined;
  const start = new Date(input.startAt);
  if (!Number.isFinite(start.getTime())) return undefined;
  const end = input.endAt ? new Date(input.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  if (!Number.isFinite(end.getTime()) || end <= start) return undefined;
  return Calendar.createEventAsync(input.calendarId, {
    title: input.title.slice(0, 160),
    startDate: start,
    endDate: end,
    timeZone: input.timezone,
    notes: input.notes?.slice(0, 1000),
  });
}

export async function readDeviceCalendarEvent(eventId: string): Promise<Calendar.Event | undefined> {
  if (Platform.OS === 'web') return undefined;
  try { return await Calendar.getEventAsync(eventId); } catch { return undefined; }
}

export async function updateDeviceCalendarEvent(eventId: string, input: { title: string; startAt: string; endAt?: string; timezone?: string; notes?: string }): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const start = new Date(input.startAt); const end = new Date(input.endAt ?? start.getTime() + 3600000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return false;
  try {
    await Calendar.updateEventAsync(eventId, { title: input.title.slice(0, 160), startDate: start, endDate: end, timeZone: input.timezone, notes: input.notes?.slice(0, 1000) });
    return Boolean(await readDeviceCalendarEvent(eventId));
  } catch { return false; }
}

export async function recoverLocalNotifications(items: Array<{ id: string; title: string; body: string; scheduledFor: string; target?: string }>): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return {};
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const existingIds = new Set(existing.map((item) => item.identifier));
  const recovered: Record<string, string> = {};
  for (const item of items) {
    if (Date.parse(item.scheduledFor) <= Date.now()) continue;
    if (existingIds.has(item.id)) { recovered[item.id] = item.id; continue; }
    const id = await scheduleLocalNotification({ ...item, id: item.id, privateMode: true });
    if (id) recovered[item.id] = id;
  }
  return recovered;
}

export async function discoverLocalVoices(): Promise<Array<{ identifier: string; name: string; language: string; quality: string; localService: boolean }>> {
  if (Platform.OS === 'web') return [];
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices
      .map((voice) => ({ identifier: voice.identifier, name: voice.name, language: voice.language, quality: String(voice.quality), localService: 'localService' in voice ? Boolean(voice.localService) : true }))
      .filter((voice) => voice.localService);
  } catch {
    return [];
  }
}

export async function speakLocalExplanation(text: string, options: { language: string; voice?: string; rate?: number } = { language: 'de-DE' }): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    Speech.stop();
    Speech.speak(text.slice(0, 4000), { language: options.language, voice: options.voice, rate: options.rate ?? 0.95 });
    return true;
  } catch {
    return false;
  }
}

export function pauseLocalExplanation(): void { if (Platform.OS !== 'web') Speech.pause(); }
export function resumeLocalExplanation(): void { if (Platform.OS !== 'web') Speech.resume(); }
export function stopLocalExplanation(): void { if (Platform.OS !== 'web') Speech.stop(); }