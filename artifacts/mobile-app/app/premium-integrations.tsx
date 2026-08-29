import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDownloadImapAttachment, useListImapMessages } from '@workspace/api-client-react';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { createDeviceCalendarEvent, readDeviceCalendarEvent, requestAndReadDeviceCalendars, scheduleLocalNotification, updateDeviceCalendarEvent } from '@/utils/nativeIntegrations';
import { hasPremiumEntitlement, type CalendarProviderType, type EmailAccount, type EmailProviderType } from '@/utils/premiumIntegrations';
import { premiumCopy } from '@/utils/premiumLocalization';
import { connectOAuthProvider, createRemoteCalendarEvent, downloadProviderAttachment, listProviderAttachments, listProviderMessages, listRemoteCalendars, readRemoteCalendarEvent, updateRemoteCalendarEvent } from '@/utils/providerAdapters';
import { attachmentToPendingAsset } from '@/utils/imapAttachmentImport';
import { loadImapPassword, saveImapPassword } from '@/utils/secureCredentials';
import { customImportRange, imapConfigForEmail, importRange, normalizeAttachment, normalizeProviderMessage } from '@/utils/realIntegrations';

const PROVIDERS: Array<{ type: EmailProviderType; label: string }> = [{ type: 'google', label: 'Google' }, { type: 'microsoft', label: 'Microsoft' }, { type: 'imap', label: 'IMAP TLS' }];
type Target = { providerType: CalendarProviderType; accountId: string; calendarId: string; title: string };

export default function PremiumIntegrationsScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const { language, backSymbol, t } = useTranslation(); const copy = premiumCopy(language);
  const { integrations, calendarCandidates, actions, setPendingAsset, activateTesterAccess, completeEmailConnection, updateEmailSyncRange, updateEmailConnectionStatus, addEmailMessages, disconnectEmailConnection, addCalendarCandidateFromAction, confirmCalendarCandidate, setCalendarAccountTarget, persistCalendarEvent, createNotificationForAction } = useApp();
  const listImap = useListImapMessages(); const downloadImap = useDownloadImapAttachment();
  const [busy, setBusy] = useState<string>(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [host, setHost] = useState(''); const [mailbox, setMailbox] = useState('INBOX');
  const [rangeFrom, setRangeFrom] = useState(''); const [rangeTo, setRangeTo] = useState('');
  const [deviceCalendars, setDeviceCalendars] = useState<Array<{ id: string; title: string; allowsModifications: boolean }>>([]); const [targets, setTargets] = useState<Target[]>([]); const [selectedTarget, setSelectedTarget] = useState<Target>();
  const entitled = hasPremiumEntitlement(integrations.entitlement); const top = (Platform.OS === 'web' ? 67 : insets.top) + 16;
  const activeCandidates = useMemo(() => calendarCandidates.filter((item) => item.status !== 'completed' && item.status !== 'cancelled'), [calendarCandidates]);
  const imapAccount = integrations.emailAccounts.find((item) => item.providerType === 'imap' && item.connectionStatus === 'connected');

  const connect = async (type: 'google' | 'microsoft') => {
    if (!entitled || busy) return;
    setBusy(type); const result = await connectOAuthProvider(type);
    if (result.ok) { const at = new Date().toISOString(); completeEmailConnection({ id: result.accountId, providerType: type, displayName: result.displayName, emailAddress: result.emailAddress, connectionStatus: 'connected', permissions: ['metadata', 'read_messages', 'read_attachments'], syncEnabled: true, syncRange: importRange(30), createdAt: at, updatedAt: at }); }
    else Alert.alert(copy.prepared, result.error === 'requires_configuration' ? copy.consent : copy.importedRemain);
    setBusy(undefined);
  };
  const connectImap = async () => {
    if (!entitled || busy) return;
    const address = email.trim().toLocaleLowerCase(); const presetHost = imapConfigForEmail(address)?.host;
    const requestedHost = host.trim().toLowerCase();
    // The API deliberately accepts audited presets only; never send credentials to a custom host.
    if (requestedHost && requestedHost !== presetHost) { Alert.alert(copy.prepared, 'Custom IMAP hosts are blocked for security. Use a supported preset mailbox.'); return; }
    const resolvedHost = presetHost;
    if (!address.includes('@') || !password || !resolvedHost || !mailbox.trim()) { Alert.alert(copy.email, copy.consent); return; }
    const accountId = `imap-${address.replace(/[^a-z0-9]/g, '-')}`; setBusy('imap');
    try {
      if (!(await saveImapPassword(accountId, password))) throw new Error('secure_storage');
      const secret = await loadImapPassword(accountId); if (!secret) throw new Error('secure_storage');
      const page = await listImap.mutateAsync({ data: { host: resolvedHost, port: 993, email: address, password: secret, mailbox: mailbox.trim(), ...importRange(30), pageSize: 25 } });
      const at = new Date().toISOString();
      const account: EmailAccount = { id: accountId, providerType: 'imap', displayName: 'IMAP TLS', emailAddress: address, connectionStatus: 'connected', permissions: ['metadata', 'read_messages', 'read_attachments'], syncEnabled: true, syncRange: importRange(30), imapHost: resolvedHost, imapMailbox: mailbox.trim(), createdAt: at, updatedAt: at };
      const messages = page.messages.map((item) => normalizeProviderMessage({ provider: 'imap', accountId, id: String(item.uid), subject: item.subject, sender: item.from.join(', '), receivedAt: item.receivedAt ?? at, hasAttachments: item.attachments.length > 0 }));
      const attachments = page.messages.flatMap((item) => item.attachments.map((attachment) => normalizeAttachment({ messageId: `imap-message-${item.uid}`, id: `imap-attachment-${item.uid}-${attachment.part}`, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size })).filter((attachment): attachment is NonNullable<typeof attachment> => !!attachment));
      completeEmailConnection(account); addEmailMessages(messages, attachments); setPassword('');
    } catch { Alert.alert(copy.email, copy.importedRemain); }
    setBusy(undefined);
  };
  const sync = async (account: EmailAccount, days?: 7 | 30 | 90, nextPage = false) => {
    const range = days ? importRange(days) : customImportRange(rangeFrom, rangeTo) ?? account.syncRange;
    if (!range) { Alert.alert(copy.email, copy.consent); return; }
    setBusy(`sync-${account.id}`); try {
      if (account.providerType === 'imap') {
        if (!account.imapHost || !account.imapMailbox || !['imap.gmx.com', 'imap.web.de', 'imap.mail.yahoo.com', 'secureimap.t-online.de'].includes(account.imapHost)) throw new Error('imap_configuration');
        const secret = await loadImapPassword(account.id); if (!secret) throw new Error('credential_missing');
        const page = await listImap.mutateAsync({ data: { host: account.imapHost, port: 993, email: account.emailAddress, password: secret, mailbox: account.imapMailbox, ...range, pageSize: 25, cursor: nextPage ? account.lastSyncCursor : undefined } });
        const at = new Date().toISOString();
        const messages = page.messages.map((item) => normalizeProviderMessage({ provider: 'imap', accountId: account.id, id: String(item.uid), subject: item.subject, sender: item.from.join(', '), receivedAt: item.receivedAt ?? at, hasAttachments: item.attachments.length > 0 }));
        const attachments = page.messages.flatMap((item) => item.attachments.map((attachment) => normalizeAttachment({ messageId: `imap-message-${item.uid}`, id: `imap-attachment-${item.uid}-${attachment.part}`, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size })).filter((attachment): attachment is NonNullable<typeof attachment> => !!attachment));
        updateEmailSyncRange(account.id, range, page.nextCursor); addEmailMessages(messages, attachments); return;
      }
      if (account.providerType !== 'google' && account.providerType !== 'microsoft') return;
      const page = await listProviderMessages(account.providerType, account, range, nextPage ? account.lastSyncCursor : undefined);
      const attachments = (await Promise.all(page.messages.filter((message) => message.hasAttachments).map((message) => listProviderAttachments(account.providerType as 'google' | 'microsoft', account, message)))).flat();
      updateEmailSyncRange(account.id, range, page.nextCursor); addEmailMessages(page.messages, attachments);
    } catch (error) {
      if (error instanceof Error && error.message === 'reconnect_required') updateEmailConnectionStatus(account.id, 'reconnect_required', 'expired');
      Alert.alert(copy.email, copy.importedRemain);
    } finally { setBusy(undefined); }
  };
  const importAttachment = async (attachmentId: string) => {
    const attachment = integrations.emailAttachments.find((item) => item.id === attachmentId); const message = attachment && integrations.emailMessages.find((item) => item.id === attachment.messageId);
    if (!attachment || !message) return;
    if (message.accountId !== imapAccount?.id && (message.accountId.startsWith('google-') || message.accountId.startsWith('microsoft-'))) {
      const account = integrations.emailAccounts.find((item) => item.id === message.accountId);
      if (!account || (account.providerType !== 'google' && account.providerType !== 'microsoft')) return;
      setBusy(`attachment-${attachmentId}`);
      try { setPendingAsset(await attachmentToPendingAsset(await downloadProviderAttachment(account.providerType, account, message, attachment))); router.push('/document-details'); }
      catch (error) { if (error instanceof Error && error.message === 'reconnect_required') updateEmailConnectionStatus(account.id, 'reconnect_required', 'expired'); Alert.alert(copy.email, copy.importedRemain); }
      setBusy(undefined); return;
    }
    const selectedImapAccount = integrations.emailAccounts.find((item) => item.id === message.accountId && item.providerType === 'imap');
    if (!selectedImapAccount?.imapHost || !selectedImapAccount.imapMailbox || !['imap.gmx.com', 'imap.web.de', 'imap.mail.yahoo.com', 'secureimap.t-online.de'].includes(selectedImapAccount.imapHost)) { Alert.alert(copy.prepared, 'This IMAP host is blocked for security.'); return; }
    const uid = Number(message.providerMessageId); const part = attachmentId.split('-').slice(3).join('-'); setBusy(`attachment-${attachmentId}`);
    try { const secret = await loadImapPassword(selectedImapAccount.id); if (!secret || !Number.isInteger(uid)) throw new Error('credential_missing');
      const result = await downloadImap.mutateAsync({ data: { host: selectedImapAccount.imapHost, port: 993, email: selectedImapAccount.emailAddress, password: secret, mailbox: selectedImapAccount.imapMailbox, uid, part } });
      setPendingAsset(await attachmentToPendingAsset(result)); router.push('/document-details');
    } catch { Alert.alert(copy.email, copy.importedRemain); } setBusy(undefined);
  };
  const loadCalendars = async () => {
    if (!entitled) return; setBusy('calendar');
    try {
      const device = (await requestAndReadDeviceCalendars()).filter((item) => item.allowsModifications).map((item) => ({ id: item.id, title: item.title, allowsModifications: true }));
      const remote = (await Promise.all(integrations.emailAccounts.filter((item): item is EmailAccount & { providerType: 'google' | 'microsoft' } => item.connectionStatus === 'connected' && (item.providerType === 'google' || item.providerType === 'microsoft')).map(async (account) => (await listRemoteCalendars(account.providerType, account.id)).filter((item) => item.canWrite).map((item): Target => ({ providerType: account.providerType === 'google' ? 'google_calendar' : 'microsoft_calendar', accountId: account.id, calendarId: item.id, title: `${account.displayName}: ${item.title}` }))))).flat();
      const deviceTargets = device.map((item): Target => ({ providerType: 'device_calendar', accountId: 'device-calendar', calendarId: item.id, title: item.title }));
      setDeviceCalendars(device); setTargets([...deviceTargets, ...remote]); setSelectedTarget((current) => current ?? deviceTargets[0] ?? remote[0]);
    } catch { Alert.alert(copy.calendar, copy.importedRemain); } setBusy(undefined);
  };
  const chooseTarget = (target: Target) => {
    setSelectedTarget(target); const at = new Date().toISOString();
    setCalendarAccountTarget({ id: target.accountId, providerType: target.providerType, displayName: target.title, connectionStatus: 'connected', permissions: ['read_events', 'write_events'], selectedCalendarId: target.calendarId, syncEnabled: true, createdAt: integrations.calendarAccounts.find((item) => item.id === target.accountId)?.createdAt ?? at, updatedAt: at });
  };
  const confirmEvent = async (candidateId: string) => {
    const candidate = integrations.calendarCandidates.find((item) => item.id === candidateId); if (!candidate || !selectedTarget || !entitled) return;
    const linked = integrations.calendarEvents.find((item) => item.sourceReference === candidate.sourceReference && item.calendarId === selectedTarget.calendarId && item.providerType === selectedTarget.providerType);
    setBusy(`event-${candidateId}`); confirmCalendarCandidate(candidateId);
    try {
      const input = { title: candidate.title, startAt: candidate.startAt, endAt: candidate.endAt, timezone: candidate.timezone, sourceReference: candidate.sourceReference };
      if (selectedTarget.providerType === 'device_calendar') {
        const id = linked?.providerEventId && await updateDeviceCalendarEvent(linked.providerEventId, input) ? linked.providerEventId : await createDeviceCalendarEvent({ ...input, calendarId: selectedTarget.calendarId, notes: `Documenta: ${candidate.sourceDocumentId ?? candidate.sourceReference}` });
        const read = id && await readDeviceCalendarEvent(id); if (!id || !read) throw new Error('calendar_write');
        persistCalendarEvent(candidateId, { providerType: selectedTarget.providerType, providerEventId: id, calendarAccountId: selectedTarget.accountId, calendarId: selectedTarget.calendarId, title: read.title, startAt: new Date(read.startDate).toISOString(), endAt: new Date(read.endDate).toISOString(), timezone: candidate.timezone });
      } else {
        const id = linked?.providerEventId && await updateRemoteCalendarEvent(selectedTarget.providerType, selectedTarget.accountId, selectedTarget.calendarId, linked.providerEventId, input) ? linked.providerEventId : await createRemoteCalendarEvent(selectedTarget.providerType, selectedTarget.accountId, selectedTarget.calendarId, input);
        const read = id && await readRemoteCalendarEvent(selectedTarget.providerType, selectedTarget.accountId, selectedTarget.calendarId, id); if (!id || !read) throw new Error('calendar_write');
        persistCalendarEvent(candidateId, { providerType: selectedTarget.providerType, providerEventId: id, calendarAccountId: selectedTarget.accountId, calendarId: selectedTarget.calendarId, title: read.title, startAt: read.startAt, endAt: read.endAt, timezone: candidate.timezone });
      }
    } catch { Alert.alert(copy.calendar, copy.importedRemain); } setBusy(undefined);
  };
  const testNotification = async () => { const id = await scheduleLocalNotification({ title: copy.notifications, body: copy.localNotifications, scheduledFor: new Date(Date.now() + 5000).toISOString(), target: '/notifications', privateMode: true }); if (!id) Alert.alert(copy.notifications, copy.localNotifications); };

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.page, { paddingTop: top, direction: language === 'ar' ? 'rtl' : 'ltr' }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={backSymbol} onPress={() => router.back()}><Text style={[styles.back, { color: colors.coral }]}>{backSymbol}</Text></Pressable><Text accessibilityRole="header" style={[styles.title, { color: colors.navy }]}>{copy.title}</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{copy.subtitle}</Text>
    <View style={[styles.badge, { backgroundColor: entitled ? colors.sage : colors.coralSoft }]}><Feather name={entitled ? 'check-circle' : 'lock'} size={16} color={colors.navy}/><Text style={[styles.badgeText, { color: colors.navy }]}>{entitled ? copy.premiumActive : copy.premiumLocked}</Text></View>{!entitled ? <View style={styles.row}><Action label="15" onPress={() => activateTesterAccess(15)} colors={colors}/><Action label="30" onPress={() => activateTesterAccess(30)} colors={colors}/></View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={copy.manualImport} onPress={() => router.push('/(tabs)/add' as never)} style={[styles.primary, { backgroundColor: colors.coral }]}><Feather name="file-plus" size={18} color={colors.white}/><Text style={[styles.buttonText, { color: colors.white }]}>{copy.manualImport}</Text></Pressable>
    <Text style={[styles.section, { color: colors.navy }]}>{copy.email}</Text>
    {PROVIDERS.filter(({ type }) => type === 'google' || type === 'microsoft').map(({ type, label }) => { const oauthType = type as 'google' | 'microsoft'; const accounts = integrations.emailAccounts.filter((item) => item.providerType === type); return <View key={type} style={[styles.stackCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.cardRow}><Feather name="mail" size={19} color={colors.coral}/><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.navy }]}>{label}</Text><Text style={[styles.caption, { color: colors.mutedForeground }]}>{copy.consent}</Text></View><Action label={busy === type ? '…' : copy.connect} disabled={!entitled || !!busy} onPress={() => void connect(oauthType)} colors={colors}/></View>{accounts.map((account) => <View key={account.id} style={{ gap: 7 }}><View style={styles.cardRow}><Text style={[styles.caption, { color: colors.mutedForeground, flex: 1 }]}>{account.emailAddress} · {account.connectionStatus}</Text><Action label={copy.disconnect} onPress={() => disconnectEmailConnection(account.id)} colors={colors}/></View><View style={styles.row}>{([7, 30, 90] as const).map((days) => <Action key={days} label={`${days}`} disabled={!!busy} onPress={() => void sync(account, days)} colors={colors}/>) }{account.lastSyncCursor ? <Action label="Next page" disabled={!!busy} onPress={() => void sync(account, undefined, true)} colors={colors}/> : null}<Action label="Retry" disabled={!!busy} onPress={() => void sync(account, undefined)} colors={colors}/></View></View>)}</View>; })}
    <View style={styles.row}><TextInput accessibilityLabel="Import from" value={rangeFrom} onChangeText={setRangeFrom} placeholder="From (ISO date)" style={[styles.input, { color: colors.navy, borderColor: colors.border, flex: 1 }]}/><TextInput accessibilityLabel="Import to" value={rangeTo} onChangeText={setRangeTo} placeholder="To (ISO date)" style={[styles.input, { color: colors.navy, borderColor: colors.border, flex: 1 }]}/></View>
    <View style={[styles.stackCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.navy }]}>IMAP TLS</Text>{integrations.emailAccounts.filter((item) => item.providerType === 'imap').map((account) => <View key={account.id} style={styles.cardRow}><Text style={[styles.caption, { color: colors.mutedForeground, flex: 1 }]}>{account.emailAddress} · {account.connectionStatus}</Text><Action label={copy.disconnect} onPress={() => disconnectEmailConnection(account.id)} colors={colors}/></View>)}<TextInput accessibilityLabel="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" style={[styles.input, { color: colors.navy, borderColor: colors.border }]}/><TextInput accessibilityLabel="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={[styles.input, { color: colors.navy, borderColor: colors.border }]}/><TextInput accessibilityLabel="IMAP host" autoCapitalize="none" value={host} onChangeText={setHost} placeholder={imapConfigForEmail(email)?.host ?? 'IMAP host (autodetect)'} style={[styles.input, { color: colors.navy, borderColor: colors.border }]}/><TextInput accessibilityLabel="Mailbox" value={mailbox} onChangeText={setMailbox} placeholder="INBOX" style={[styles.input, { color: colors.navy, borderColor: colors.border }]}/><Action label={busy === 'imap' ? '…' : copy.connect} disabled={!entitled || !!busy} onPress={() => void connectImap()} colors={colors}/></View>
    {integrations.emailAccounts.filter((item) => item.providerType === 'imap').map((account) => <View key={`imap-sync-${account.id}`} style={[styles.row, { marginTop: -6 }]}>{([7, 30, 90] as const).map((days) => <Action key={days} label={`${days}`} disabled={!!busy} onPress={() => void sync(account, days)} colors={colors}/>)}<Action label="Custom / Resync" disabled={!!busy} onPress={() => void sync(account)} colors={colors}/>{account.lastSyncCursor ? <Action label="Next page" disabled={!!busy} onPress={() => void sync(account, undefined, true)} colors={colors}/> : null}<Action label="Retry" disabled={!!busy} onPress={() => void sync(account)} colors={colors}/></View>)}
    {integrations.emailAttachments.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.caption, { color: colors.navy, flex: 1 }]}>{item.filename}</Text><Action label={busy === `attachment-${item.id}` ? '…' : copy.manualImport} disabled={!!busy} onPress={() => void importAttachment(item.id)} colors={colors}/></View>)}
    <Text style={[styles.section, { color: colors.navy }]}>{copy.calendar}</Text><View style={[styles.stackCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.cardRow}><Feather name="calendar" size={19} color={colors.coral}/><Text style={[styles.body, { color: colors.navy }]}>{targets.length || deviceCalendars.length ? `${targets.length || deviceCalendars.length}` : copy.consent}</Text><Action label={busy === 'calendar' ? '…' : copy.connect} disabled={!entitled || !!busy} onPress={() => void loadCalendars()} colors={colors}/></View>{targets.map((item) => <Pressable key={`${item.accountId}-${item.calendarId}`} accessibilityRole="radio" accessibilityLabel={item.title} accessibilityState={{ selected: item.calendarId === selectedTarget?.calendarId && item.accountId === selectedTarget.accountId }} onPress={() => chooseTarget(item)} style={[styles.choice, { borderColor: item.calendarId === selectedTarget?.calendarId && item.accountId === selectedTarget.accountId ? colors.coral : colors.border }]}><Text style={[styles.caption, { color: colors.navy }]}>{item.title}</Text></Pressable>)}</View>
    {activeCandidates.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.navy }]}>{item.title}</Text><Text style={[styles.caption, { color: colors.mutedForeground }]}>{item.startAt} · {item.confidence}</Text></View><Action label={entitled ? copy.reviewCandidate : copy.premiumRequired} disabled={!entitled} onPress={() => addCalendarCandidateFromAction(item)} colors={colors}/></View>)}
    {integrations.calendarCandidates.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.navy }]}>{item.title}</Text><Text style={[styles.caption, { color: colors.mutedForeground }]}>{item.status === 'created' ? copy.eventCreated : item.startAt}</Text></View><Action label={entitled ? copy.confirmEvent : copy.premiumRequired} disabled={!entitled || !selectedTarget || !!busy} onPress={() => void confirmEvent(item.id)} colors={colors}/></View>)}
    <Text style={[styles.section, { color: colors.navy }]}>{copy.notifications}</Text><View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bell" size={19} color={colors.coral}/><View style={{ flex: 1 }}><Text style={[styles.caption, { color: colors.mutedForeground }]}>{copy.localNotifications}</Text></View><Action label={copy.connect} disabled={!entitled} onPress={() => void testNotification()} colors={colors}/></View>{actions.filter((item) => item.dueDate && item.status === 'confirmed' && item.userConfirmed).map((item) => <View key={`notification-${item.id}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.caption, { color: colors.navy, flex: 1 }]}>{item.title}</Text><Action label={entitled ? t('automation.reminderRule') : copy.premiumRequired} disabled={!entitled} onPress={() => createNotificationForAction(item.id)} colors={colors}/></View>)}
  </ScrollView>;
}
function Action({ label, onPress, disabled, colors }: { label: string; onPress: () => void; disabled?: boolean; colors: ReturnType<typeof useColors> }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.smallButton, { borderColor: colors.border, opacity: disabled ? .5 : 1 }]}><Text numberOfLines={2} style={[styles.actionText, { color: colors.navy }]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ page:{paddingHorizontal:20,paddingBottom:60,gap:12},back:{fontSize:24,fontFamily:'Inter_700Bold'},title:{fontSize:29,lineHeight:36,fontFamily:'Inter_700Bold'},subtitle:{fontSize:13,lineHeight:20,fontFamily:'Inter_400Regular'},badge:{alignSelf:'flex-start',paddingHorizontal:12,paddingVertical:8,borderRadius:99,flexDirection:'row',gap:7,alignItems:'center'},badgeText:{fontSize:11,fontFamily:'Inter_700Bold'},card:{minHeight:58,borderWidth:1,borderRadius:18,padding:14,flexDirection:'row',gap:12,alignItems:'center'},stackCard:{borderWidth:1,borderRadius:18,padding:14,gap:10},cardRow:{flexDirection:'row',gap:12,alignItems:'center'},row:{flexDirection:'row',gap:8,flexWrap:'wrap'},body:{flex:1,fontSize:11,lineHeight:17,fontFamily:'Inter_500Medium'},primary:{minHeight:54,borderRadius:18,padding:15,flexDirection:'row',gap:12,alignItems:'center'},buttonText:{fontSize:13,fontFamily:'Inter_700Bold'},section:{fontSize:18,fontFamily:'Inter_700Bold',marginTop:12},cardTitle:{fontSize:13,fontFamily:'Inter_700Bold'},caption:{fontSize:10,lineHeight:15,fontFamily:'Inter_400Regular'},smallButton:{maxWidth:145,minHeight:40,justifyContent:'center',borderWidth:1,borderRadius:12,paddingHorizontal:10,paddingVertical:8},actionText:{fontSize:10,fontFamily:'Inter_700Bold',textAlign:'center'},choice:{minHeight:40,justifyContent:'center',borderWidth:1,borderRadius:12,paddingHorizontal:12},input:{minHeight:42,borderWidth:1,borderRadius:12,paddingHorizontal:12,fontFamily:'Inter_400Regular',fontSize:12} });