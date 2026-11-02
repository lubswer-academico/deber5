import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HomeAppLayout } from '@/components/layout/HomeAppLayout';
import { useMeterSearchController } from '@/presentation/meter/useMeterSearchController';
import { formatMeterStatusLabel } from '@/domain/meter/meterRules';
import {
  EPMAPS_COLORS,
  EPMAPS_RADII,
  EPMAPS_SPACING,
  EPMAPS_TOUCH,
  EPMAPS_TYPOGRAPHY,
} from '@/constants/theme';

export default function MeterSearchScreen() {
  const router = useRouter();
  const {
    meterCodeInput,
    isValidCode,
    validationError,
    isSearching,
    meterData,
    isFromCache,
    noSignalNoDataWarning,
    duplicateBlock,
    errorMessage,
    handleCodeChange,
    searchMeter,
    proceedToCaptureWithoutData,
    readyToCapture,
  } = useMeterSearchController();

  const handleNavigateToCapture = (hasPriorData: boolean) => {
    router.push({
      pathname: '/reading-wizard',
      params: {
        meterCode: meterData?.code || meterCodeInput,
        previousReading: meterData ? String(meterData.lastReading.value) : undefined,
        averageConsumption: meterData ? String(meterData.averageConsumption) : undefined,
        hasNoPreviousData: hasPriorData ? 'false' : 'true',
      },
    });
  };

  return (
    <HomeAppLayout>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera de Navegación */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Regresar a inicio"
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={EPMAPS_COLORS.primaryDark}
              style={styles.backButtonIcon}
            />
            <Text style={styles.backButtonText}>Regresar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Consulta de Medidor</Text>
          <Text style={styles.subtitle}>
            Ingrese el código oficial del medidor (ej. MED-100201)
          </Text>
        </View>

        {/* Sección de Entrada de Código */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Código del medidor</Text>
          <TextInput
            style={[
              styles.input,
              validationError ? styles.inputErrorBorder : null,
            ]}
            value={meterCodeInput}
            onChangeText={handleCodeChange}
            placeholder="MED-XXXXXX o dígitos"
            placeholderTextColor={EPMAPS_COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            accessibilityLabel="Campo de entrada de código de medidor"
          />

          {validationError ? (
            <View style={styles.inlineErrorRow}>
              <Ionicons name="alert-circle" size={14} color={EPMAPS_COLORS.danger} style={styles.errorIcon} />
              <Text style={styles.validationErrorText}>{validationError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.searchButton,
              (!isValidCode || isSearching) ? styles.searchButtonDisabled : null,
            ]}
            onPress={searchMeter}
            disabled={!isValidCode || isSearching}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Consultar Medidor"
          >
            {isSearching ? (
              <ActivityIndicator color={EPMAPS_COLORS.textInverse} />
            ) : (
              <View style={styles.buttonInnerRow}>
                <Ionicons name="search" size={18} color={EPMAPS_COLORS.textInverse} style={styles.buttonIcon} />
                <Text style={styles.searchButtonText}>Consultar Medidor</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Mensaje de Error General */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.alertHeaderRow}>
              <Ionicons name="alert-circle" size={18} color={EPMAPS_COLORS.danger} style={styles.alertHeaderIcon} />
              <Text style={styles.errorBoxTitle}>Aviso</Text>
            </View>
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Caso Límite D3: Sin señal y sin datos en caché */}
        {noSignalNoDataWarning ? (
          <View style={styles.warningBox}>
            <View style={styles.alertHeaderRow}>
              <Ionicons name="cloud-offline-outline" size={20} color={EPMAPS_COLORS.warning} style={styles.alertHeaderIcon} />
              <Text style={styles.warningBoxTitle}>Sin Cobertura de Red</Text>
            </View>
            <Text style={styles.warningBoxText}>
              Sin conexión y sin datos en memoria de jornada. Los datos de cuenta y lectura anterior quedan pendientes de contrastar.
            </Text>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={proceedToCaptureWithoutData}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continuar a captura sin datos previos"
            >
              <Ionicons name="arrow-forward-circle-outline" size={18} color={EPMAPS_COLORS.textInverse} style={styles.buttonIcon} />
              <Text style={styles.secondaryActionButtonText}>
                Continuar a captura sin datos previos
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Ficha Técnica / Comercial del Medidor (7 campos) */}
        {meterData ? (
          <View style={styles.recordCard}>
            <View style={styles.recordHeaderRow}>
              <View style={styles.recordTitleCol}>
                <Text style={styles.recordCategoryLabel}>Medidor identificado</Text>
                <Text style={styles.recordCodeText}>{meterData.code}</Text>
              </View>
              <View style={[styles.badge, isFromCache ? styles.badgeCache : styles.badgeOnline]}>
                <Ionicons
                  name={isFromCache ? 'hardware-chip-outline' : 'cloud-done-outline'}
                  size={13}
                  color={isFromCache ? EPMAPS_COLORS.accentDark : EPMAPS_COLORS.success}
                  style={styles.badgeIcon}
                />
                <Text style={[styles.badgeText, isFromCache ? styles.badgeCacheText : styles.badgeOnlineText]}>
                  {isFromCache ? 'Memoria de Jornada' : 'Oficina en Línea'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* 7 Campos obligatorios sin numeración de índice artificial */}
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Dirección</Text>
              <Text style={styles.dataValue}>{meterData.address}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Sector</Text>
              <Text style={styles.dataValue}>{meterData.sector}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Nro. de cuenta</Text>
              <Text style={[styles.dataValue, styles.accountValue]}>{meterData.accountNumber}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Estado</Text>
              <View
                style={[
                  styles.statusBadge,
                  meterData.status === 'suspended' && styles.statusBadgeWarning,
                  meterData.status === 'inactive' && styles.statusBadgeDanger,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    meterData.status === 'suspended' && styles.statusBadgeTextWarning,
                    meterData.status === 'inactive' && styles.statusBadgeTextDanger,
                  ]}
                >
                  {formatMeterStatusLabel(meterData.status)}
                </Text>
              </View>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Última lectura</Text>
              <Text style={[styles.dataValue, styles.readingValue]}>
                {meterData.lastReading.value}
                <Text style={styles.unitSuffix}> m³</Text>
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Fecha última lectura</Text>
              <Text style={[styles.dataValue, styles.tabularValue]}>
                {new Date(meterData.lastReading.date).toLocaleDateString('es-EC')}
              </Text>
            </View>

            <View style={[styles.dataRow, styles.dataRowLast]}>
              <Text style={styles.dataLabel}>Consumo promedio</Text>
              <Text style={[styles.dataValue, styles.averageValue]}>
                {meterData.averageConsumption}
                <Text style={styles.unitSuffix}> m³/mes</Text>
              </Text>
            </View>
          </View>
        ) : null}

        {/* Caso Límite D4: Bloqueo o Alerta por Duplicidad Mensual R10 */}
        {duplicateBlock?.hasDuplicate ? (
          <View style={[
            styles.duplicateBox,
            duplicateBlock.isSubmitted ? styles.duplicateBoxBlocked : styles.duplicateBoxPending
          ]}>
            <View style={styles.alertHeaderRow}>
              <Ionicons
                name={duplicateBlock.isSubmitted ? 'lock-closed' : 'alert-circle'}
                size={20}
                color={duplicateBlock.isSubmitted ? EPMAPS_COLORS.danger : EPMAPS_COLORS.warning}
                style={styles.alertHeaderIcon}
              />
              <Text style={[
                styles.duplicateBoxTitle,
                duplicateBlock.isSubmitted ? styles.duplicateTitleBlocked : styles.duplicateTitlePending
              ]}>
                {duplicateBlock.isSubmitted ? 'Bloqueo por Duplicidad Mensual' : 'Lectura Mensual Existente'}
              </Text>
            </View>
            <Text style={[
              styles.duplicateBoxText,
              duplicateBlock.isSubmitted ? styles.duplicateTextBlocked : styles.duplicateTextPending
            ]}>
              {duplicateBlock.message}
            </Text>

            {duplicateBlock.canEditPending ? (
              <TouchableOpacity
                style={styles.editPendingButton}
                onPress={() => router.push('/reading-queue')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Ver o editar lectura pendiente"
              >
                <Ionicons name="file-tray-stacked-outline" size={18} color={EPMAPS_COLORS.textInverse} style={styles.buttonIcon} />
                <Text style={styles.editPendingButtonText}>Ver / Editar en Bandeja de Lecturas</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Botón de Acción Principal para Iniciar Captura */}
        {readyToCapture && !duplicateBlock?.hasDuplicate ? (
          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={() => handleNavigateToCapture(!!meterData)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Registrar Nueva Lectura"
            >
              <Ionicons name="create-outline" size={22} color={EPMAPS_COLORS.textInverse} style={styles.buttonIcon} />
              <Text style={styles.captureButtonText}>Registrar Nueva Lectura</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </HomeAppLayout>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    marginBottom: EPMAPS_SPACING.lg,
  },
  backButton: {
    minHeight: EPMAPS_TOUCH.minHeight,
    minWidth: EPMAPS_TOUCH.minWidth,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: EPMAPS_SPACING.xs,
    alignSelf: 'flex-start',
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
  title: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.xl,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textMuted,
    marginTop: 3,
  },
  inputContainer: {
    backgroundColor: EPMAPS_COLORS.surface,
    borderRadius: EPMAPS_RADII.lg,
    padding: EPMAPS_SPACING.lg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    marginBottom: EPMAPS_SPACING.lg,
  },
  inputLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    color: EPMAPS_COLORS.primaryDark,
    marginBottom: EPMAPS_SPACING.sm,
  },
  input: {
    minHeight: EPMAPS_TOUCH.minHeight,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderMedium,
    borderRadius: EPMAPS_RADII.md,
    paddingHorizontal: EPMAPS_SPACING.md,
    fontSize: 17,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.textDark,
    backgroundColor: EPMAPS_COLORS.surface,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  inputErrorBorder: {
    borderColor: EPMAPS_COLORS.danger,
    backgroundColor: EPMAPS_COLORS.dangerSoftBg,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorIcon: {
    marginRight: 4,
  },
  validationErrorText: {
    color: EPMAPS_COLORS.danger,
    fontSize: 12.5,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    flex: 1,
  },
  searchButton: {
    minHeight: EPMAPS_TOUCH.buttonHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: EPMAPS_SPACING.md,
  },
  searchButtonDisabled: {
    backgroundColor: EPMAPS_COLORS.primaryDisabled,
  },
  searchButtonText: {
    color: EPMAPS_COLORS.textInverse,
    fontSize: 15.5,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertHeaderIcon: {
    marginRight: 6,
  },
  errorBox: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderColor: EPMAPS_COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: EPMAPS_RADII.md,
    padding: EPMAPS_SPACING.md,
    marginBottom: EPMAPS_SPACING.lg,
  },
  errorBoxTitle: {
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    fontSize: 14,
  },
  errorBoxText: {
    color: EPMAPS_COLORS.dangerDark,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: EPMAPS_COLORS.warningBg,
    borderColor: EPMAPS_COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: EPMAPS_RADII.lg,
    padding: EPMAPS_SPACING.md,
    marginBottom: EPMAPS_SPACING.lg,
  },
  warningBoxTitle: {
    color: EPMAPS_COLORS.warningDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    fontSize: 14.5,
  },
  warningBoxText: {
    color: EPMAPS_COLORS.warningDark,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    marginBottom: EPMAPS_SPACING.md,
    lineHeight: 19,
  },
  secondaryActionButton: {
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: EPMAPS_SPACING.md,
  },
  secondaryActionButtonText: {
    color: EPMAPS_COLORS.textInverse,
    fontSize: 13.5,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
  },
  recordCard: {
    backgroundColor: EPMAPS_COLORS.surface,
    borderRadius: EPMAPS_RADII.lg,
    padding: EPMAPS_SPACING.lg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    marginBottom: EPMAPS_SPACING.lg,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitleCol: {
    flex: 1,
  },
  recordCategoryLabel: {
    fontSize: 12,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
    color: EPMAPS_COLORS.textMuted,
    marginBottom: 2,
  },
  recordCodeText: {
    fontSize: 20,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: EPMAPS_RADII.full,
    borderWidth: 1,
  },
  badgeCache: {
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderColor: EPMAPS_COLORS.bgBlueBorder,
  },
  badgeOnline: {
    backgroundColor: EPMAPS_COLORS.successBg,
    borderColor: EPMAPS_COLORS.successBorder,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
  },
  badgeCacheText: {
    color: EPMAPS_COLORS.accentDark,
  },
  badgeOnlineText: {
    color: EPMAPS_COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: EPMAPS_COLORS.borderLight,
    marginVertical: EPMAPS_SPACING.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: EPMAPS_COLORS.bgSecondary,
  },
  dataRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  dataLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textMuted,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
  },
  dataValue: {
    fontSize: 14,
    color: EPMAPS_COLORS.textDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: EPMAPS_SPACING.sm,
  },
  tabularValue: {
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  accountValue: {
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  statusBadge: {
    backgroundColor: EPMAPS_COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: EPMAPS_RADII.sm,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.successBorder,
  },
  statusBadgeWarning: {
    backgroundColor: EPMAPS_COLORS.warningBg,
    borderColor: EPMAPS_COLORS.warningBorder,
  },
  statusBadgeDanger: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderColor: EPMAPS_COLORS.dangerBorder,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.success,
  },
  statusBadgeTextWarning: {
    color: EPMAPS_COLORS.warningDark,
  },
  statusBadgeTextDanger: {
    color: EPMAPS_COLORS.danger,
  },
  readingValue: {
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  averageValue: {
    color: EPMAPS_COLORS.primary,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  unitSuffix: {
    fontSize: 12,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
    color: EPMAPS_COLORS.textMuted,
  },
  duplicateBox: {
    borderRadius: EPMAPS_RADII.lg,
    padding: EPMAPS_SPACING.md,
    borderWidth: 1,
    marginBottom: EPMAPS_SPACING.lg,
  },
  duplicateBoxBlocked: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderColor: EPMAPS_COLORS.dangerBorder,
  },
  duplicateBoxPending: {
    backgroundColor: EPMAPS_COLORS.warningBg,
    borderColor: EPMAPS_COLORS.warningBorder,
  },
  duplicateBoxTitle: {
    fontSize: 14.5,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
  duplicateTitleBlocked: {
    color: EPMAPS_COLORS.danger,
  },
  duplicateTitlePending: {
    color: EPMAPS_COLORS.warningDark,
  },
  duplicateBoxText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    lineHeight: 18,
  },
  duplicateTextBlocked: {
    color: EPMAPS_COLORS.dangerDark,
  },
  duplicateTextPending: {
    color: EPMAPS_COLORS.warningDark,
  },
  editPendingButton: {
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: EPMAPS_SPACING.md,
    paddingHorizontal: EPMAPS_SPACING.md,
  },
  editPendingButtonText: {
    color: EPMAPS_COLORS.textInverse,
    fontSize: 13.5,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
  },
  captureContainer: {
    marginTop: EPMAPS_SPACING.xs,
  },
  captureButton: {
    minHeight: EPMAPS_TOUCH.buttonHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: EPMAPS_SPACING.lg,
  },
  captureButtonText: {
    color: EPMAPS_COLORS.textInverse,
    fontSize: 16,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
});

