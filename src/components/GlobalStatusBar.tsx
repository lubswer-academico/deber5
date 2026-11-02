import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalStatusController } from '@/presentation/session/useGlobalStatusController';
import {
  EPMAPS_COLORS,
  EPMAPS_RADII,
  EPMAPS_SPACING,
  EPMAPS_TOUCH,
  EPMAPS_TYPOGRAPHY,
} from '@/constants/theme';

export function GlobalStatusBar() {
  const { isOnline, connectionLabel, pendingLabel, pendingCount } =
    useGlobalStatusController();
  const hasPending = pendingCount > 0;

  return (
    <View
      style={[
        styles.container,
        isOnline ? styles.onlineBackground : styles.offlineBackground,
      ]}
      testID="global-status-bar"
    >
      {/* Sección Izquierda: Indicador de Conectividad Telemetría */}
      <View
        style={[
          styles.statusChip,
          isOnline ? styles.statusChipOnline : styles.statusChipOffline,
        ]}
      >
        <View
          style={[
            styles.signalIconWrap,
            isOnline ? styles.signalIconWrapOnline : styles.signalIconWrapOffline,
          ]}
        >
          <Ionicons
            name={isOnline ? 'cellular' : 'cloud-offline-outline'}
            size={13}
            color={isOnline ? EPMAPS_COLORS.successDark : EPMAPS_COLORS.danger}
          />
        </View>
        <Text
          style={[
            styles.statusText,
            isOnline ? styles.statusTextOnline : styles.statusTextOffline,
          ]}
        >
          {connectionLabel}
        </Text>
      </View>

      {/* Centro: Logotipo Institucional */}
      <View style={styles.brandSection}>
        <Ionicons
          name="water"
          size={14}
          color={EPMAPS_COLORS.primary}
          style={styles.brandIcon}
        />
        <Text style={styles.brandText}>EPMAPS</Text>
      </View>

      {/* Sección Derecha: Chip Estructurado de Cola Pendiente */}
      <View
        style={[
          styles.pendingChip,
          hasPending ? styles.pendingChipActive : styles.pendingChipIdle,
        ]}
        accessibilityLabel={pendingLabel}
      >
        <Ionicons
          name={hasPending ? 'cloud-upload-outline' : 'checkmark-done-outline'}
          size={13}
          color={hasPending ? EPMAPS_COLORS.primaryDark : EPMAPS_COLORS.textMuted}
          style={styles.pendingIcon}
        />
        <Text
          style={[
            styles.pendingLabelText,
            hasPending ? styles.pendingLabelActive : styles.pendingLabelIdle,
          ]}
        >
          Pendientes
        </Text>
        <View
          style={[
            styles.pendingCountBox,
            hasPending ? styles.pendingCountBoxActive : styles.pendingCountBoxIdle,
          ]}
        >
          <Text
            style={[
              styles.pendingCountNumber,
              hasPending
                ? styles.pendingCountNumberActive
                : styles.pendingCountNumberIdle,
            ]}
          >
            {pendingCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: EPMAPS_TOUCH.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: EPMAPS_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: EPMAPS_COLORS.borderLight,
    backgroundColor: EPMAPS_COLORS.surface,
  },
  onlineBackground: {
    backgroundColor: EPMAPS_COLORS.surface,
  },
  offlineBackground: {
    backgroundColor: EPMAPS_COLORS.dangerSoftBg,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 9,
    paddingLeft: 4,
    paddingVertical: 3,
    borderRadius: EPMAPS_RADII.sm,
    borderWidth: 1,
  },
  statusChipOnline: {
    backgroundColor: EPMAPS_COLORS.bgSecondary,
    borderColor: EPMAPS_COLORS.borderLight,
  },
  statusChipOffline: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderColor: EPMAPS_COLORS.dangerBorder,
  },
  signalIconWrap: {
    width: 22,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  signalIconWrapOnline: {
    backgroundColor: EPMAPS_COLORS.successBg,
  },
  signalIconWrapOffline: {
    backgroundColor: EPMAPS_COLORS.surface,
  },
  statusText: {
    fontSize: 12,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
  },
  statusTextOnline: {
    color: EPMAPS_COLORS.textDark,
  },
  statusTextOffline: {
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: {
    marginRight: 4,
  },
  brandText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    letterSpacing: 1.1,
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: EPMAPS_RADII.sm,
    borderWidth: 1,
  },
  pendingChipIdle: {
    backgroundColor: EPMAPS_COLORS.bgSecondary,
    borderColor: EPMAPS_COLORS.borderLight,
  },
  pendingChipActive: {
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderColor: EPMAPS_COLORS.bgBlueBorder,
  },
  pendingIcon: {
    marginRight: 4,
  },
  pendingLabelText: {
    fontSize: 12,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    marginRight: 6,
  },
  pendingLabelIdle: {
    color: EPMAPS_COLORS.textMuted,
  },
  pendingLabelActive: {
    color: EPMAPS_COLORS.primaryDark,
  },
  pendingCountBox: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCountBoxIdle: {
    backgroundColor: EPMAPS_COLORS.surface,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
  },
  pendingCountBoxActive: {
    backgroundColor: EPMAPS_COLORS.primaryDark,
  },
  pendingCountNumber: {
    fontSize: 11,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  pendingCountNumberIdle: {
    color: EPMAPS_COLORS.textDark,
  },
  pendingCountNumberActive: {
    color: EPMAPS_COLORS.surface,
  },
});

