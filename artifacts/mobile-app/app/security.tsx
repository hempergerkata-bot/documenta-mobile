import { Alert, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { driveUiStatus } from '@/utils/truthfulness';

export default function SecurityScreen() {
  const c = useColors();
  const { t, number, date, direction, backSymbol } = useTranslation();
  const {
    security, profiles, activities, backup, connectGoogleDriveBackup, disconnectGoogleDriveBackup,
    createCloudBackup, cancelBackup, discoverBackupRestore, prepareCloudRestore, confirmCloudRestore,
    deleteCloudSnapshot, exportLocalBackup, importLocalBackup, updateBackupPolicy,
  } = useApp();
  const [passphrase, setPassphrase] = useState('');
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const account = backup.accounts.find(item => item.providerType === 'google_drive');
  const driveStatus = driveUiStatus({ platform: Platform.OS, clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID, account });
  const driveConfigured = driveStatus !== 'configuration_required';
  const driveConnected = driveStatus === 'connected';
  const busy = ['preparing', 'uploading', 'restoring'].includes(backup.progress.state);
  const button = (label: string, onPress: () => void | Promise<void>, disabled = false, destructive = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => void onPress()} style={{ opacity: disabled ? .5 : 1, padding: 12, borderRadius: 10, backgroundColor: destructive ? '#B42318' : c.coral }}>
      <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold', textAlign }}>{label}</Text>
    </Pressable>
  );
  const guarded = (action: (value: string) => Promise<void>) => async () => {
    if (!passphrase) return;
    await action(passphrase);
    setPassphrase('');
  };
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')}><Text style={{ color: c.coral, textAlign }}>{backSymbol} {t('common.back')}</Text></Pressable>
    <Text style={{ color: c.navy, fontSize: 28, fontFamily: 'Inter_700Bold', textAlign }}>{t('security.title')}</Text>
    <View style={{ padding: 13, borderRadius: 13, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, gap: 6 }}>
      <Text style={{ color: c.navy, fontFamily: 'Inter_700Bold', textAlign }}>{t('security.biometric')} · {t('security.pin')} · {t('security.autoLock')}</Text>
      <Text style={{ color: c.mutedForeground, textAlign }}>{t('security.enforcementUnavailable')}</Text>
    </View>
    <Text style={{ color: c.navy, textAlign }}>{t('security.retention', { policy: security.retentionPolicy })}</Text>

    <View accessible accessibilityLabel={t('backup.title')} style={{ gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
      <Text style={{ color: c.navy, fontFamily: 'Inter_700Bold', fontSize: 19, textAlign }}>{t('backup.title')}</Text>
      <Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.privacy')}</Text>
      <Text style={{ color: c.navy, fontFamily: 'Inter_700Bold', textAlign }}>{t('backup.drive')}: {driveConnected ? t('backup.connected') : driveConfigured ? t('backup.disconnected') : t('backup.configuration')}</Text>
      {backup.error ? <Text accessibilityRole="alert" style={{ color: '#B42318', textAlign }}>{backup.error}</Text> : null}
      {driveConnected ? button(t('backup.disconnect'), disconnectGoogleDriveBackup) : button(t('backup.connect'), connectGoogleDriveBackup, !driveConfigured)}
      {!driveConnected ? <Text style={{ color: c.mutedForeground, textAlign }}>{driveConfigured ? t('backup.disconnected') : t('backup.configuration')}</Text> : null}
      <TextInput value={passphrase} onChangeText={setPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('backup.passphrase')} accessibilityHint={t('backup.passphraseHint')} placeholder={t('backup.passphrase')} placeholderTextColor={c.mutedForeground} textAlign={textAlign} style={{ borderWidth: 1, borderColor: c.border, color: c.navy, padding: 12, borderRadius: 10 }} />
      <Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.passphraseHint')}</Text>
      {busy ? <><Text accessibilityLiveRegion="polite" style={{ color: c.navy, textAlign }}>{backup.progress.stage} · {number(backup.progress.completedFiles)}/{number(backup.progress.totalFiles)}</Text>{button(t('backup.cancel'), cancelBackup)}</> : button(t('backup.create'), guarded(createCloudBackup), !passphrase || !driveConnected)}
      <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: c.navy, textAlign }}>{t('backup.automatic')}</Text><Switch accessibilityState={{ disabled: !driveConnected }} disabled={!driveConnected} value={driveConnected && backup.automatic.enabled} onValueChange={enabled => updateBackupPolicy({ enabled })} /></View>
      <Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.foreground')}</Text>
      {button(t('backup.discover'), guarded(discoverBackupRestore), !passphrase || busy || !driveConnected)}
      {backup.latestSuccessfulBackupAt ? <Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.latestBackup', { time: date(backup.latestSuccessfulBackupAt) })}</Text> : null}
      {backup.latestSuccessfulRestoreAt ? <Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.latestRestore', { time: date(backup.latestSuccessfulRestoreAt) })}</Text> : null}
      <Text style={{ color: c.navy, fontFamily: 'Inter_700Bold', textAlign }}>{t('backup.snapshots')}</Text>
      {!backup.snapshots.length ? <Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.noSnapshots')}</Text> : backup.snapshots.map(snapshot => <View key={snapshot.manifestId} style={{ gap: 7, padding: 10, borderWidth: 1, borderColor: c.border, borderRadius: 10 }}>
        <Text style={{ color: c.navy, textAlign }}>{date(snapshot.createdAt)}</Text><Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.documentsAssets', { documents: number(snapshot.documentCount), assets: number(snapshot.assetCount), size: `${number(snapshot.byteSize / 1024 / 1024)} MB` })}</Text>
        {button(t('backup.prepareRestore'), guarded(value => prepareCloudRestore(snapshot.manifestId, value)), !passphrase)}
        {button(t('backup.delete'), () => Alert.alert(t('backup.deleteTitle'), t('backup.deleteMessage'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('backup.delete'), style: 'destructive', onPress: () => void deleteCloudSnapshot(snapshot.manifestId) }]), false, true)}
      </View>)}
      {backup.restorePreview ? <View style={{ gap: 8 }}><Text style={{ color: c.navy, textAlign }}>{t('backup.conflicts', { count: number(backup.restorePreview.conflicts) })}</Text>{button(t('backup.confirmRestore'), confirmCloudRestore, !backup.restorePreview.readyToCommit)}</View> : null}
      {button(t('backup.export'), guarded(exportLocalBackup), !passphrase)}{button(t('backup.import'), guarded(importLocalBackup), !passphrase)}
      <Text style={{ color: c.navy, fontFamily: 'Inter_700Bold', textAlign }}>{t('backup.newPhone')}</Text><Text style={{ color: c.mutedForeground, textAlign }}>{t('backup.newPhoneText')}</Text>
    </View>
    <Text style={{ color: c.navy, fontFamily: 'Inter_700Bold', textAlign }}>{t('security.audit')}</Text><Text style={{ color: c.mutedForeground, textAlign }}>{t('security.auditText', { ai: security.aiProcessingEnabled ? t('common.open') : t('common.none'), cloud: security.cloudSyncEnabled ? t('common.open') : t('common.none') })}</Text><Text style={{ color: c.mutedForeground, textAlign }}>{t('security.profilesAccess', { profiles: profiles.map(p => p.name).join(', ') || t('common.none'), count: number(activities.length) })}</Text>
  </ScrollView>;
}