import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HomeAppLayout } from '@/components/layout/HomeAppLayout';
import { useReadingQueueController } from '@/presentation/readingQueue/useReadingQueueController';
import { useSyncEngine } from '@/presentation/sync/useSyncEngine';
import { useGlobalStatusController } from '@/presentation/session/useGlobalStatusController';
import { deleteConsolidatedReading } from '@/storage/reading/readingDraftStorage';
import { deletePhoto } from '@/services/photo/photoStorageService';
import { formatReadingStatusLabel } from '@/domain/readingQueue/queueRules';
import { ConsolidatedReading, QueueFilter } from '@/domain/reading/types';
import {
  EPMAPS_COLORS,
  EPMAPS_RADII,
  EPMAPS_SPACING,
  EPMAPS_TOUCH,
  EPMAPS_TYPOGRAPHY,
} from '@/constants/theme';

const FILTER_TABS: Array<{
  id: QueueFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'all', label: 'Todas', icon: 'layers-outline' },
  { id: 'pending', label: 'Pendientes', icon: 'time-outline' },
  { id: 'submitted', label: 'Enviadas', icon: 'cloud-done-outline' },
];

export default function ReadingQueueScreen() {
  const router = useRouter();
  const { isOnline } = useGlobalStatusController();
  const {
    filteredReadings,
    filter,
    isLoading,
    setFilter,
    loadQueue,
  } = useReadingQueueController();

  const { isSyncing, syncSummary, syncError } = useSyncEngine(() => {
    loadQueue();
  });

  const handleDiscardReading = (item: ConsolidatedReading) => {
    Alert.alert(
      'Descartar lectura',
      `¿Desea descartar la lectura del medidor ${item.meterCode}? Se eliminará permanentemente del dispositivo y se borrará su fotografía.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.photoUri) {
                await deletePhoto(item.photoUri);
              }
              await deleteConsolidatedReading(item.id);
              await loadQueue();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo descartar la lectura.');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [loadQueue])
  );

  const getStatusBadgeStyle = (status: ConsolidatedReading['status']) => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return styles.badgeVerification;
      case 'PENDING_SYNC':
        return styles.badgeSync;
      case 'REQUIRES_ATTENTION':
        return styles.badgeAttention;
      case 'SUBMITTED':
        return styles.badgeSubmitted;
    }
  };

  const getStatusTextStyle = (status: ConsolidatedReading['status']) => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return styles.badgeTextVerification;
      case 'PENDING_SYNC':
        return styles.badgeTextSync;
      case 'REQUIRES_ATTENTION':
        return styles.badgeTextAttention;
      case 'SUBMITTED':
        return styles.badgeTextSubmitted;
    }
  };

  const getStatusIconConfig = (
    status: ConsolidatedReading['status']
  ): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return { name: 'shield-half-outline', color: EPMAPS_COLORS.verification };
      case 'PENDING_SYNC':
        return { name: 'cloud-upload-outline', color: EPMAPS_COLORS.pendingSync };
      case 'REQUIRES_ATTENTION':
        return { name: 'warning-outline', color: EPMAPS_COLORS.attention };
      case 'SUBMITTED':
        return { name: 'checkmark-circle', color: EPMAPS_COLORS.success };
    }
  };

  const renderReadingItem = ({ item }: { item: ConsolidatedReading }) => {
    const formattedDate = new Date(item.capturedAt).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isNonNumeric = item.condition === 'Inaccesible';
    const readingSummary = isNonNumeric
      ? item.inaccessibilityReason || 'Inaccesible'
      : item.currentReading !== null && item.currentReading !== undefined
      ? `${item.currentReading} m³`
      : 'Sin lectura';

    const isRequiresAttention = item.status === 'REQUIRES_ATTENTION';
    const statusIcon = getStatusIconConfig(item.status);

    return (
      <TouchableOpacity
        style={[styles.card, isRequiresAttention && styles.cardAttention]}
        activeOpacity={0.85}
        onPress={() => {
          if (isRequiresAttention) {
            router.push({
              pathname: '/reading-wizard',
              params: {
                meterCode: item.meterCode,
                editingId: item.id,
              },
            });
          } else {
            router.push({ pathname: '/reading-detail', params: { id: item.id } });
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Medidor ${item.meterCode}, estado ${formatReadingStatusLabel(item.status)}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.meterCodeRow}>
            <Ionicons
              name="speedometer-outline"
              size={18}
              color={isRequiresAttention ? EPMAPS_COLORS.attention : EPMAPS_COLORS.primaryDark}
              style={styles.meterCodeIcon}
            />
            <Text style={styles.meterCode}>{item.meterCode}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
            <Ionicons
              name={statusIcon.name}
              size={13}
              color={statusIcon.color}
              style={styles.statusBadgeIcon}
            />
            <Text style={[styles.statusBadgeText, getStatusTextStyle(item.status)]}>
              {formatReadingStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {isRequiresAttention ? (
          <View style={styles.attentionNotice}>
            <Ionicons
              name="alert-circle"
              size={18}
              color={EPMAPS_COLORS.attention}
              style={styles.noticeLeadIcon}
            />
            <Text style={styles.attentionNoticeText}>
              {item.requiresAttentionReason ||
                'Se detectó anomalía no confirmada o inconsistencia. Toque aquí para revisar o subsanar.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardBody}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Condición:</Text>
            <Text style={styles.dataValue}>{item.condition}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Lectura / Motivo:</Text>
            <Text style={[styles.dataValue, styles.tabularValue]}>{readingSummary}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Fecha de registro:</Text>
            <Text style={[styles.dataValue, styles.tabularValue]}>{formattedDate}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Evidencia:</Text>
            <View style={styles.evidenceValueRow}>
              {item.photoUri ? (
                <>
                  <Ionicons
                    name="camera"
                    size={14}
                    color={EPMAPS_COLORS.accentDark}
                    style={styles.evidenceIcon}
                  />
                  <Text style={[styles.dataValue, styles.evidenceHighlightText]}>
                    Con fotografía
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="camera-outline"
                    size={14}
                    color={EPMAPS_COLORS.textMuted}
                    style={styles.evidenceIcon}
                  />
                  <Text style={[styles.dataValue, styles.evidenceMutedText]}>Sin foto</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {isRequiresAttention ? (
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardDiscardButton}
              activeOpacity={0.85}
              onPress={() => handleDiscardReading(item)}
              accessibilityRole="button"
              accessibilityLabel={`Descartar lectura del medidor ${item.meterCode}`}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={EPMAPS_COLORS.danger}
                style={styles.actionButtonIcon}
              />
              <Text style={styles.cardDiscardButtonText}>Descartar lectura</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <HomeAppLayout>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar al inicio"
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={EPMAPS_COLORS.primaryDark}
            style={styles.backButtonIcon}
          />
          <Text style={styles.backButtonText}>Regresar</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.title}>Bandeja de Lecturas</Text>
            <Text style={styles.subtitle}>Registro de capturas del mes</Text>
          </View>
          <View style={styles.countPill}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color={EPMAPS_COLORS.accentDark}
              style={styles.countPillIcon}
            />
            <Text style={styles.countPillText}>{filteredReadings.length}</Text>
          </View>
        </View>
      </View>

      {/* Indicador de Sincronización Automática en Segundo Plano & Avisos */}
      {isSyncing ? (
        <View style={styles.syncStatusBanner}>
          <ActivityIndicator size="small" color={EPMAPS_COLORS.primaryDark} />
          <Text style={styles.syncStatusText}>
            Sincronizando lecturas automáticamente con oficina...
          </Text>
        </View>
      ) : null}

      {!isOnline ? (
        <View style={styles.offlineNoticeContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={16}
            color={EPMAPS_COLORS.danger}
            style={styles.noticeLeadIcon}
          />
          <Text style={styles.offlineNotice}>
            Modo sin conexión. La cola se enviará automáticamente al recuperar la señal.
          </Text>
        </View>
      ) : null}

      {syncError ? (
        <View style={styles.errorNotice}>
          <Ionicons
            name="alert-circle"
            size={16}
            color={EPMAPS_COLORS.danger}
            style={styles.noticeLeadIcon}
          />
          <Text style={styles.errorNoticeText}>{syncError}</Text>
        </View>
      ) : null}

      {syncSummary && !isSyncing && syncSummary.sent > 0 ? (
        <View style={styles.summaryNotice}>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={EPMAPS_COLORS.success}
            style={styles.noticeLeadIcon}
          />
          <Text style={styles.summaryNoticeText}>
            Sincronización automática: {syncSummary.sent} enviadas al sistema central.
          </Text>
        </View>
      ) : null}

      {/* Selector de Filtros */}
      <View style={styles.tabContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.85}
              onPress={() => setFilter(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Filtro ${tab.label}`}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={isActive ? EPMAPS_COLORS.textInverse : EPMAPS_COLORS.textMuted}
                style={styles.tabButtonIcon}
              />
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={EPMAPS_COLORS.primary} />
          <Text style={styles.loadingText}>Cargando bandeja de lecturas...</Text>
        </View>
      ) : filteredReadings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="file-tray-outline" size={38} color={EPMAPS_COLORS.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>Sin lecturas registradas</Text>
          <Text style={styles.emptyText}>
            No existen lecturas en la memoria local para el filtro seleccionado.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReadings}
          keyExtractor={(item) => item.id}
          renderItem={renderReadingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </HomeAppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: EPMAPS_SPACING.lg,
    paddingTop: EPMAPS_SPACING.sm,
    paddingBottom: EPMAPS_SPACING.md,
  },
  backButton: {
    minHeight: EPMAPS_TOUCH.minHeight,
    minWidth: EPMAPS_TOUCH.minWidth,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: EPMAPS_SPACING.xs,
    paddingRight: EPMAPS_SPACING.md,
  },
  backButtonIcon: {
    marginRight: 6,
  },
  backButtonText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginRight: EPMAPS_SPACING.sm,
  },
  title: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.xl,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textMuted,
    marginTop: 2,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    paddingHorizontal: EPMAPS_SPACING.md,
    paddingVertical: 6,
    borderRadius: EPMAPS_RADII.full,
  },
  countPillIcon: {
    marginRight: 4,
  },
  countPillText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.accentDark,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.md,
    gap: EPMAPS_SPACING.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.surface,
    borderWidth: 1.2,
    borderColor: EPMAPS_COLORS.borderMedium,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: EPMAPS_SPACING.sm,
  },
  tabButtonActive: {
    backgroundColor: EPMAPS_COLORS.primaryDark,
    borderColor: EPMAPS_COLORS.primaryDark,
  },
  tabButtonIcon: {
    marginRight: 5,
  },
  tabButtonText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.textMuted,
  },
  tabButtonTextActive: {
    color: EPMAPS_COLORS.textInverse,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
  listContainer: {
    paddingHorizontal: EPMAPS_SPACING.lg,
    paddingBottom: EPMAPS_SPACING.hero,
  },
  card: {
    backgroundColor: EPMAPS_COLORS.surface,
    borderRadius: EPMAPS_RADII.lg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    padding: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: EPMAPS_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: EPMAPS_COLORS.borderLight,
    paddingBottom: EPMAPS_SPACING.sm,
  },
  meterCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meterCodeIcon: {
    marginRight: 6,
  },
  meterCode: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.lg,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: EPMAPS_SPACING.sm,
    paddingVertical: 5,
    borderRadius: EPMAPS_RADII.sm,
    borderWidth: 1,
  },
  statusBadgeIcon: {
    marginRight: 4,
  },
  badgeVerification: {
    backgroundColor: EPMAPS_COLORS.verificationBg,
    borderColor: EPMAPS_COLORS.verificationBorder,
  },
  badgeSync: {
    backgroundColor: EPMAPS_COLORS.pendingSyncBg,
    borderColor: EPMAPS_COLORS.pendingSyncBorder,
  },
  badgeAttention: {
    backgroundColor: EPMAPS_COLORS.attentionBg,
    borderColor: EPMAPS_COLORS.attentionBorder,
  },
  badgeSubmitted: {
    backgroundColor: EPMAPS_COLORS.successBg,
    borderColor: EPMAPS_COLORS.successBorder,
  },
  statusBadgeText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.xs,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
  badgeTextVerification: {
    color: EPMAPS_COLORS.verification,
  },
  badgeTextSync: {
    color: EPMAPS_COLORS.pendingSync,
  },
  badgeTextAttention: {
    color: EPMAPS_COLORS.attention,
  },
  badgeTextSubmitted: {
    color: EPMAPS_COLORS.success,
  },
  syncStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginHorizontal: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.sm,
    gap: EPMAPS_SPACING.sm,
  },
  syncStatusText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    flex: 1,
  },
  offlineNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.dangerBg,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginHorizontal: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.sm,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerBorder,
  },
  offlineNotice: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    flex: 1,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.dangerBg,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginHorizontal: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.sm,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerBorder,
  },
  errorNoticeText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    flex: 1,
  },
  summaryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.successBg,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginHorizontal: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.sm,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.successBorder,
  },
  summaryNoticeText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.success,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
    flex: 1,
  },
  noticeLeadIcon: {
    marginRight: EPMAPS_SPACING.sm,
  },
  cardAttention: {
    borderColor: EPMAPS_COLORS.attentionBorder,
    borderWidth: 2,
    backgroundColor: EPMAPS_COLORS.attentionSurface,
  },
  attentionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.attentionBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.attentionBorder,
    padding: EPMAPS_SPACING.sm,
    borderRadius: EPMAPS_RADII.sm,
    marginBottom: EPMAPS_SPACING.sm,
  },
  attentionNoticeText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.xs,
    color: EPMAPS_COLORS.attentionDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    flex: 1,
    lineHeight: 17,
  },
  cardBody: {
    gap: 6,
  },
  cardActionsRow: {
    marginTop: EPMAPS_SPACING.md,
    paddingTop: EPMAPS_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: EPMAPS_COLORS.attentionBorder,
    alignItems: 'flex-end',
  },
  cardDiscardButton: {
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.dangerSoftBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerSoftBorder,
    borderRadius: EPMAPS_RADII.md,
    paddingHorizontal: EPMAPS_SPACING.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonIcon: {
    marginRight: 6,
  },
  cardDiscardButtonText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textMuted,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
  },
  dataValue: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.textDark,
    flexShrink: 1,
    textAlign: 'right',
  },
  tabularValue: {
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
    color: EPMAPS_COLORS.primaryDark,
  },
  evidenceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evidenceIcon: {
    marginRight: 4,
  },
  evidenceHighlightText: {
    color: EPMAPS_COLORS.accentDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
  evidenceMutedText: {
    color: EPMAPS_COLORS.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EPMAPS_SPACING.xxl,
  },
  loadingText: {
    marginTop: EPMAPS_SPACING.md,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    color: EPMAPS_COLORS.textMuted,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: EPMAPS_SPACING.hero,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: EPMAPS_RADII.full,
    backgroundColor: EPMAPS_COLORS.bgBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: EPMAPS_SPACING.md,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
  },
  emptyTitle: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.lg,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
  },
});
