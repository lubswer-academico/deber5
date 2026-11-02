import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlobalStatusBar } from '../components/GlobalStatusBar';
import { useReadingWizardController } from '../presentation/reading/useReadingWizardController';
import { requestBackgroundSync } from '../presentation/sync/useSyncEngine';
import { MeterCondition } from '../domain/reading/types';
import {
  EPMAPS_COLORS,
  EPMAPS_RADII,
  EPMAPS_SPACING,
  EPMAPS_TOUCH,
  EPMAPS_TYPOGRAPHY,
} from '../constants/theme';

const CONDITION_ICONS: Record<MeterCondition, keyof typeof Ionicons.glyphMap> = {
  Normal: 'checkmark-circle-outline',
  Inaccesible: 'lock-closed-outline',
  Dañado: 'construct-outline',
};

export default function ReadingWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    meterCode?: string;
    previousReading?: string;
    averageConsumption?: string;
    hasNoPreviousData?: string;
    editingId?: string;
  }>();

  const meterCode = params.meterCode || 'MED-000000';
  const previousReading = params.previousReading ? Number(params.previousReading) : null;
  const averageConsumption = params.averageConsumption ? Number(params.averageConsumption) : null;
  const hasNoPreviousData = params.hasNoPreviousData === 'true';
  const editingReadingId = params.editingId;

  const {
    currentStep,
    draft,
    requirements,
    consumptionInfo,
    isAnomaly,
    hasExistingDraft,
    isSaving,
    cameraPermissionDenied,
    validationError,
    isEditMode,
    setCondition,
    setInaccessibilityReason,
    setDamageDescription,
    setCurrentReading,
    setAnomalyConfirmed,
    goToNextStep,
    goToPreviousStep,
    capturePhoto,
    removePhoto,
    resumeExistingDraft,
    discardExistingDraft,
    submitFinalReading,
  } = useReadingWizardController({
    meterCode,
    previousReading,
    averageConsumption,
    hasNoPreviousData,
    editingReadingId,
  });

  const handleFinish = async () => {
    const success = await submitFinalReading();
    if (success) {
      requestBackgroundSync();

      Alert.alert(
        isEditMode ? 'Lectura Actualizada' : 'Lectura Registrada',
        isEditMode
          ? `La corrección para el medidor ${meterCode} ha sido guardada en la cola local.`
          : `La lectura del medidor ${meterCode} ha sido guardada en la cola local de pendientes.`,
        [
          {
            text: 'Aceptar',
            onPress: () => router.replace('/home'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlobalStatusBar />

      {/* Modal/Banner de detección de borrador previo */}
      {hasExistingDraft && !isEditMode ? (
        <View style={styles.draftModalContainer}>
          <View style={styles.draftModalCard}>
            <View style={styles.alertHeaderRow}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={EPMAPS_COLORS.primaryDark}
                style={styles.alertHeaderIcon}
              />
              <Text style={styles.draftModalTitle}>Borrador pendiente detectado</Text>
            </View>
            <Text style={styles.draftModalText}>
              Existe una captura iniciada previamente para el medidor {meterCode}. ¿Desea reanudarla
              o descartarla para comenzar de nuevo?
            </Text>
            <View style={styles.draftModalActions}>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={discardExistingDraft}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Descartar borrador"
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={EPMAPS_COLORS.primaryDark}
                  style={styles.buttonIconSmall}
                />
                <Text style={styles.discardButtonText} numberOfLines={1}>
                  Descartar borrador
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resumeExistingDraft}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Reanudar captura"
              >
                <Ionicons
                  name="play-circle-outline"
                  size={17}
                  color={EPMAPS_COLORS.textInverse}
                  style={styles.buttonIconSmall}
                />
                <Text style={styles.resumeButtonText} numberOfLines={1}>
                  Reanudar captura
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Encabezado y Navegación Superior */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Regresar a consulta"
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
              <Text style={styles.title}>{isEditMode ? 'Editar Lectura' : 'Toma de Lectura'}</Text>
              <Text style={styles.subtitle}>Medidor: {meterCode}</Text>
            </View>
            <View style={styles.meterPill}>
              <Ionicons
                name="speedometer-outline"
                size={14}
                color={EPMAPS_COLORS.accentDark}
                style={styles.meterPillIcon}
              />
              <Text style={styles.meterPillText}>{meterCode}</Text>
            </View>
          </View>
        </View>

        {/* Indicador de Pasos del Wizard (sin numeración artificial 1. 2. 3.) */}
        <View style={styles.stepIndicatorContainer}>
          <View
            style={[
              styles.stepBadge,
              currentStep === 1 && styles.stepBadgeActive,
              currentStep > 1 && styles.stepBadgeCompleted,
            ]}
          >
            <Ionicons
              name={currentStep > 1 ? 'checkmark-circle' : 'shield-checkmark-outline'}
              size={14}
              color={
                currentStep === 1
                  ? EPMAPS_COLORS.textInverse
                  : currentStep > 1
                    ? EPMAPS_COLORS.accentDark
                    : EPMAPS_COLORS.textMuted
              }
              style={styles.stepBadgeIcon}
            />
            <Text
              style={[
                styles.stepBadgeText,
                currentStep === 1 && styles.stepBadgeTextActive,
                currentStep > 1 && styles.stepBadgeTextCompleted,
              ]}
            >
              Condición
            </Text>
          </View>

          <View style={[styles.stepConnector, currentStep > 1 && styles.stepConnectorActive]} />

          <View
            style={[
              styles.stepBadge,
              currentStep === 2 && styles.stepBadgeActive,
              currentStep > 2 && styles.stepBadgeCompleted,
            ]}
          >
            <Ionicons
              name={currentStep > 2 ? 'checkmark-circle' : 'speedometer-outline'}
              size={14}
              color={
                currentStep === 2
                  ? EPMAPS_COLORS.textInverse
                  : currentStep > 2
                    ? EPMAPS_COLORS.accentDark
                    : EPMAPS_COLORS.textMuted
              }
              style={styles.stepBadgeIcon}
            />
            <Text
              style={[
                styles.stepBadgeText,
                currentStep === 2 && styles.stepBadgeTextActive,
                currentStep > 2 && styles.stepBadgeTextCompleted,
              ]}
            >
              Lectura
            </Text>
          </View>

          <View style={[styles.stepConnector, currentStep > 2 && styles.stepConnectorActive]} />

          <View style={[styles.stepBadge, currentStep === 3 && styles.stepBadgeActive]}>
            <Ionicons
              name="camera-outline"
              size={14}
              color={currentStep === 3 ? EPMAPS_COLORS.textInverse : EPMAPS_COLORS.textMuted}
              style={styles.stepBadgeIcon}
            />
            <Text style={[styles.stepBadgeText, currentStep === 3 && styles.stepBadgeTextActive]}>
              Evidencia
            </Text>
          </View>
        </View>

        {/* Alerta de Error de Validación */}
        {validationError ? (
          <View style={styles.errorBox}>
            <View style={styles.alertHeaderRow}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={EPMAPS_COLORS.danger}
                style={styles.alertHeaderIcon}
              />
              <Text style={styles.errorBoxTitle}>Atención requerida</Text>
            </View>
            <Text style={styles.errorBoxText}>{validationError}</Text>
          </View>
        ) : null}

        {/* CONTENIDO DEL PASO 1: Condición del Medidor */}
        {currentStep === 1 ? (
          <View style={styles.stepContent}>
            <Text style={styles.stepSectionTitle}>Seleccione la condición física</Text>

            <View style={styles.conditionOptions}>
              {(['Normal', 'Inaccesible', 'Dañado'] as MeterCondition[]).map((cond) => {
                const isSelected = draft.condition === cond;
                return (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.conditionCard, isSelected && styles.conditionCardSelected]}
                    onPress={() => setCondition(cond)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Condición ${cond}`}
                  >
                    <Ionicons
                      name={CONDITION_ICONS[cond]}
                      size={22}
                      color={isSelected ? EPMAPS_COLORS.primary : EPMAPS_COLORS.textMuted}
                      style={styles.conditionCardIcon}
                    />
                    <Text
                      style={[
                        styles.conditionCardText,
                        isSelected && styles.conditionCardTextSelected,
                      ]}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Campo Motivo de Inaccesibilidad */}
            {requirements.reasonRequired ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Motivo de inaccesibilidad *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={draft.inaccessibilityReason || ''}
                  onChangeText={setInaccessibilityReason}
                  placeholder="Ej. Reja cerrada, perro peligroso, terreno anegado..."
                  placeholderTextColor={EPMAPS_COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Motivo de inaccesibilidad"
                />
              </View>
            ) : null}

            {/* Campo Descripción del Daño */}
            {requirements.damageDescriptionRequired ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción del daño *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={draft.damageDescription || ''}
                  onChangeText={setDamageDescription}
                  placeholder="Ej. Visor roto, esfera empañada, medidor trabado o manipulado..."
                  placeholderTextColor={EPMAPS_COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Descripción del daño"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* CONTENIDO DEL PASO 2: Lectura Numérica y Consumo */}
        {currentStep === 2 ? (
          <View style={styles.stepContent}>
            <Text style={styles.stepSectionTitle}>Ingreso de lectura actual</Text>

            {requirements.readingDisabled ? (
              <View style={styles.infoBanner}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={EPMAPS_COLORS.accentDark}
                  style={styles.bannerLeadIcon}
                />
                <Text style={styles.infoBannerText}>
                  Medidor catalogado como Inaccesible. La captura de lectura numérica está
                  deshabilitada para esta condición.
                </Text>
              </View>
            ) : (
              <View>
                {/* Referencias Previas */}
                <View style={styles.referenceContainer}>
                  <View style={styles.referenceRow}>
                    <View style={styles.referenceLabelWrap}>
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={EPMAPS_COLORS.textMuted}
                        style={styles.referenceIcon}
                      />
                      <Text style={styles.referenceLabel}>Lectura anterior</Text>
                    </View>
                    <Text style={styles.referenceValue}>
                      {draft.previousReading !== null && draft.previousReading !== undefined ? (
                        <>
                          {draft.previousReading}
                          <Text style={styles.unitSuffix}> m³</Text>
                        </>
                      ) : (
                        'Sin datos previos'
                      )}
                    </Text>
                  </View>

                  <View style={styles.referenceDivider} />

                  <View style={styles.referenceRow}>
                    <View style={styles.referenceLabelWrap}>
                      <Ionicons
                        name="analytics-outline"
                        size={15}
                        color={EPMAPS_COLORS.textMuted}
                        style={styles.referenceIcon}
                      />
                      <Text style={styles.referenceLabel}>Consumo promedio</Text>
                    </View>
                    <Text style={styles.referenceValue}>
                      {draft.averageConsumption !== null && draft.averageConsumption !== undefined ? (
                        <>
                          {draft.averageConsumption}
                          <Text style={styles.unitSuffix}> m³/mes</Text>
                        </>
                      ) : (
                        'Sin datos previos'
                      )}
                    </Text>
                  </View>
                </View>

                {/* Input Lectura */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Lectura actual (m³){requirements.readingRequired ? ' *' : ' (opcional)'}
                  </Text>
                  <TextInput
                    style={[
                      styles.numericInput,
                      !consumptionInfo.isValidConsistency && styles.numericInputDanger,
                    ]}
                    value={
                      draft.currentReading !== null && draft.currentReading !== undefined
                        ? String(draft.currentReading)
                        : ''
                    }
                    onChangeText={setCurrentReading}
                    placeholder="0"
                    placeholderTextColor={EPMAPS_COLORS.textMuted}
                    keyboardType="number-pad"
                    accessibilityLabel="Lectura actual en metros cúbicos"
                  />
                </View>

                {/* Consumo Calculado y Verificación */}
                {consumptionInfo.isPendingVerification ? (
                  <View style={styles.infoBadgePending}>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={18}
                      color={EPMAPS_COLORS.accentDark}
                      style={styles.bannerLeadIcon}
                    />
                    <Text style={styles.infoBadgePendingText}>
                      Consumo: Pendiente de verificar (modo contingencia sin datos previos)
                    </Text>
                  </View>
                ) : consumptionInfo.consumption !== null ? (
                  <View
                    style={[
                      styles.consumptionBox,
                      !consumptionInfo.isValidConsistency && styles.consumptionBoxDanger,
                    ]}
                  >
                    <View style={styles.consumptionLabelRow}>
                      <Ionicons
                        name={
                          consumptionInfo.isValidConsistency
                            ? 'water-outline'
                            : 'alert-circle-outline'
                        }
                        size={18}
                        color={
                          consumptionInfo.isValidConsistency
                            ? EPMAPS_COLORS.success
                            : EPMAPS_COLORS.danger
                        }
                        style={styles.referenceIcon}
                      />
                      <Text
                        style={[
                          styles.consumptionLabel,
                          !consumptionInfo.isValidConsistency && styles.consumptionLabelDanger,
                        ]}
                      >
                        Consumo mensual calculado:
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.consumptionValue,
                        !consumptionInfo.isValidConsistency && styles.consumptionValueDanger,
                      ]}
                    >
                      {consumptionInfo.consumption} m³
                    </Text>
                  </View>
                ) : null}

                {/* Inconsistencia física: menor a anterior */}
                {!consumptionInfo.isValidConsistency && consumptionInfo.errorMessage ? (
                  <View style={styles.dangerAlertBox}>
                    <View style={styles.alertHeaderRow}>
                      <Ionicons
                        name="warning"
                        size={18}
                        color={EPMAPS_COLORS.danger}
                        style={styles.alertHeaderIcon}
                      />
                      <Text style={styles.dangerAlertTitle}>Inconsistencia Física</Text>
                    </View>
                    <Text style={styles.dangerAlertText}>{consumptionInfo.errorMessage}</Text>
                  </View>
                ) : null}

                {/* Anomalía: Consumo > 3x promedio */}
                {isAnomaly ? (
                  <View style={styles.anomalyBox}>
                    <View style={styles.alertHeaderRow}>
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color={EPMAPS_COLORS.warning}
                        style={styles.alertHeaderIcon}
                      />
                      <Text style={styles.anomalyTitle}>ALERTA: Consumo Anómalo Detectado</Text>
                    </View>
                    <Text style={styles.anomalyText}>
                      El consumo calculado ({consumptionInfo.consumption} m³) supera en más de 3
                      veces el consumo promedio histórico ({draft.averageConsumption} m³/mes).
                    </Text>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setAnomalyConfirmed(!draft.anomalyConfirmed)}
                      activeOpacity={0.85}
                      accessibilityRole="checkbox"
                      accessibilityLabel="Confirmar revisión física de lectura"
                    >
                      <View
                        style={[
                          styles.checkboxSquare,
                          draft.anomalyConfirmed && styles.checkboxSquareChecked,
                        ]}
                      >
                        {draft.anomalyConfirmed ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={EPMAPS_COLORS.textInverse}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        He revisado físicamente el visor del medidor y confirmo que la lectura es
                        correcta.
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {/* CONTENIDO DEL PASO 3: Fotografía y Resumen */}
        {currentStep === 3 ? (
          <View style={styles.stepContent}>
            <Text style={styles.stepSectionTitle}>Evidencia fotográfica</Text>

            {requirements.photoRequired ? (
              <View style={styles.requirementBanner}>
                <Ionicons
                  name="camera"
                  size={18}
                  color={EPMAPS_COLORS.danger}
                  style={styles.bannerLeadIcon}
                />
                <Text style={styles.requirementBannerText}>
                  * La fotografía es estrictamente obligatoria para esta lectura (por condición de
                  daño o consumo anómalo).
                </Text>
              </View>
            ) : (
              <View style={styles.optionalBanner}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={EPMAPS_COLORS.success}
                  style={styles.bannerLeadIcon}
                />
                <Text style={styles.optionalBannerText}>
                  La fotografía es opcional para medidores normales sin anomalía o inaccesibles.
                </Text>
              </View>
            )}

            {cameraPermissionDenied ? (
              <View style={styles.dangerAlertBox}>
                <View style={styles.alertHeaderRow}>
                  <Ionicons
                    name="ban-outline"
                    size={18}
                    color={EPMAPS_COLORS.danger}
                    style={styles.alertHeaderIcon}
                  />
                  <Text style={styles.dangerAlertTitle}>Permiso de Cámara Denegado</Text>
                </View>
                <Text style={styles.dangerAlertText}>
                  Se requieren permisos de acceso a la cámara para capturar la evidencia. Por favor
                  habilítelos en los ajustes del terminal.
                </Text>
              </View>
            ) : null}

            {/* Vista Previa de la Foto o Botón de Disparo */}
            {draft.photoUri ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: draft.photoUri }} style={styles.photoPreviewImage} />
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={styles.retakePhotoButton}
                    onPress={capturePhoto}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Repetir fotografía"
                  >
                    <Ionicons
                      name="camera-reverse-outline"
                      size={18}
                      color={EPMAPS_COLORS.textInverse}
                      style={styles.buttonIconSmall}
                    />
                    <Text style={styles.retakePhotoButtonText}>Repetir Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={removePhoto}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar fotografía"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={EPMAPS_COLORS.danger}
                      style={styles.buttonIconSmall}
                    />
                    <Text style={styles.deletePhotoButtonText}>Eliminar Foto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.cameraTriggerButton}
                onPress={capturePhoto}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Abrir cámara y capturar foto"
              >
                <View style={styles.cameraIconCircle}>
                  <Ionicons name="camera-outline" size={28} color={EPMAPS_COLORS.primary} />
                </View>
                <Text style={styles.cameraTriggerText}>Tomar Fotografía del Medidor</Text>
                <Text style={styles.cameraTriggerSubtext}>
                  Enfoque el visor numérico y el código físico del medidor
                </Text>
              </TouchableOpacity>
            )}

            {/* Resumen Final de Captura */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <Ionicons
                  name="clipboard-outline"
                  size={17}
                  color={EPMAPS_COLORS.primaryDark}
                  style={styles.alertHeaderIcon}
                />
                <Text style={styles.summaryTitle}>Resumen de Registro</Text>
              </View>
              <View style={styles.summaryDivider} />
              <Text style={styles.summaryItem}>• Medidor: {draft.meterCode}</Text>
              <Text style={styles.summaryItem}>• Condición: {draft.condition}</Text>
              {draft.inaccessibilityReason ? (
                <Text style={styles.summaryItem}>• Motivo: {draft.inaccessibilityReason}</Text>
              ) : null}
              {draft.damageDescription ? (
                <Text style={styles.summaryItem}>• Daño: {draft.damageDescription}</Text>
              ) : null}
              {draft.currentReading !== null && draft.currentReading !== undefined ? (
                <Text style={[styles.summaryItem, styles.summaryItemTabular]}>
                  • Lectura: {draft.currentReading} m³
                </Text>
              ) : null}
              {draft.consumption !== null && draft.consumption !== undefined ? (
                <Text style={[styles.summaryItem, styles.summaryItemTabular]}>
                  • Consumo: {draft.consumption} m³
                </Text>
              ) : null}
              {draft.isAnomaly ? (
                <Text style={styles.summaryItem}>• Anomalía: Confirmada físicamente</Text>
              ) : null}
              <Text style={styles.summaryItem}>
                • Fotografía: {draft.photoUri ? 'Adjuntada' : 'No adjuntada'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Barra de Navegación de Pasos y Finalización */}
        <View style={styles.footerActions}>
          {currentStep > 1 ? (
            <TouchableOpacity
              style={styles.navButtonSecondary}
              onPress={goToPreviousStep}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Paso anterior"
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color={EPMAPS_COLORS.primaryDark}
                style={styles.buttonIconSmall}
              />
              <Text style={styles.navButtonSecondaryText}>Anterior</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerSpacer} />
          )}

          {currentStep < 3 ? (
            <TouchableOpacity
              style={styles.navButtonPrimary}
              onPress={goToNextStep}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Siguiente paso"
            >
              <Text style={styles.navButtonPrimaryText}>Siguiente</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={EPMAPS_COLORS.textInverse}
                style={styles.buttonIconRight}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButtonFinish, isSaving && styles.buttonDisabled]}
              onPress={handleFinish}
              disabled={isSaving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Finalizar y guardar en cola local"
            >
              {isSaving ? (
                <ActivityIndicator color={EPMAPS_COLORS.textInverse} />
              ) : (
                <View style={styles.finishButtonInner}>
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={20}
                    color={EPMAPS_COLORS.textInverse}
                    style={styles.buttonIconSmall}
                  />
                  <Text style={styles.navButtonFinishText}>Finalizar y Guardar</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: EPMAPS_COLORS.bgLight,
  },
  container: {
    padding: EPMAPS_SPACING.lg,
    paddingBottom: EPMAPS_SPACING.hero,
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
  meterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    paddingHorizontal: EPMAPS_SPACING.sm,
    paddingVertical: 5,
    borderRadius: EPMAPS_RADII.full,
  },
  meterPillIcon: {
    marginRight: 4,
  },
  meterPillText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.xs,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.accentDark,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: EPMAPS_COLORS.surface,
    padding: EPMAPS_SPACING.sm,
    borderRadius: EPMAPS_RADII.lg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    marginBottom: EPMAPS_SPACING.lg,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: EPMAPS_RADII.md,
    backgroundColor: EPMAPS_COLORS.bgSecondary,
  },
  stepBadgeActive: {
    backgroundColor: EPMAPS_COLORS.primaryDark,
  },
  stepBadgeCompleted: {
    backgroundColor: EPMAPS_COLORS.bgBlue,
  },
  stepBadgeIcon: {
    marginRight: 4,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.textMuted,
  },
  stepBadgeTextActive: {
    color: EPMAPS_COLORS.textInverse,
  },
  stepBadgeTextCompleted: {
    color: EPMAPS_COLORS.accentDark,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: EPMAPS_COLORS.borderLight,
    marginHorizontal: 4,
  },
  stepConnectorActive: {
    backgroundColor: EPMAPS_COLORS.accentDark,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertHeaderIcon: {
    marginRight: 6,
  },
  bannerLeadIcon: {
    marginRight: EPMAPS_SPACING.sm,
    marginTop: 1,
  },
  errorBox: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerBorder,
    borderRadius: EPMAPS_RADII.md,
    padding: EPMAPS_SPACING.md,
    marginBottom: EPMAPS_SPACING.lg,
  },
  errorBoxTitle: {
    fontSize: 14,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.danger,
  },
  errorBoxText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.danger,
    lineHeight: 18,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
  },
  draftModalContainer: {
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.bgBlueBorder,
    marginHorizontal: EPMAPS_SPACING.lg,
    marginTop: EPMAPS_SPACING.md,
    padding: EPMAPS_SPACING.lg,
    borderRadius: EPMAPS_RADII.lg,
  },
  draftModalCard: {},
  draftModalTitle: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    flex: 1,
  },
  draftModalText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textDark,
    marginBottom: EPMAPS_SPACING.md,
    lineHeight: 19,
  },
  draftModalActions: {
    flexDirection: 'row',
    gap: EPMAPS_SPACING.sm,
  },
  discardButton: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.minHeight,
    paddingHorizontal: EPMAPS_SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.surface,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderMedium,
    borderRadius: EPMAPS_RADII.md,
  },
  discardButtonText: {
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    flexShrink: 1,
  },
  resumeButton: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.minHeight,
    paddingHorizontal: EPMAPS_SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
  },
  resumeButtonText: {
    color: EPMAPS_COLORS.textInverse,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    flexShrink: 1,
  },
  stepContent: {
    backgroundColor: EPMAPS_COLORS.surface,
    padding: EPMAPS_SPACING.lg,
    borderRadius: EPMAPS_RADII.lg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    marginBottom: EPMAPS_SPACING.xl,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCategoryLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.xs,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.accentDark,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  stepSectionTitle: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.lg,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    marginBottom: EPMAPS_SPACING.lg,
  },
  conditionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: EPMAPS_SPACING.lg,
    gap: EPMAPS_SPACING.sm,
  },
  conditionCard: {
    flex: 1,
    minHeight: 74,
    borderWidth: 1.5,
    borderColor: EPMAPS_COLORS.borderMedium,
    borderRadius: EPMAPS_RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.bgLight,
    paddingVertical: EPMAPS_SPACING.sm,
    paddingHorizontal: EPMAPS_SPACING.xs,
  },
  conditionCardSelected: {
    borderColor: EPMAPS_COLORS.primary,
    borderWidth: 2,
    backgroundColor: EPMAPS_COLORS.bgBlue,
  },
  conditionCardIcon: {
    marginBottom: 4,
  },
  conditionCardText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.textMuted,
  },
  conditionCardTextSelected: {
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
  },
  inputGroup: {
    marginBottom: EPMAPS_SPACING.md,
  },
  inputLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    color: EPMAPS_COLORS.primaryDark,
    marginBottom: EPMAPS_SPACING.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderMedium,
    borderRadius: EPMAPS_RADII.md,
    paddingHorizontal: EPMAPS_SPACING.md,
    paddingVertical: EPMAPS_SPACING.md,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    color: EPMAPS_COLORS.textDark,
    backgroundColor: EPMAPS_COLORS.surface,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  referenceContainer: {
    backgroundColor: EPMAPS_COLORS.bgSecondary,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    marginBottom: EPMAPS_SPACING.lg,
  },
  referenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  referenceLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referenceIcon: {
    marginRight: 6,
  },
  referenceLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textMuted,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
  },
  referenceValue: {
    fontSize: 14,
    color: EPMAPS_COLORS.primaryDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  unitSuffix: {
    fontSize: 12,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
    color: EPMAPS_COLORS.textMuted,
  },
  referenceDivider: {
    height: 1,
    backgroundColor: EPMAPS_COLORS.borderLight,
    marginVertical: 6,
  },
  numericInput: {
    borderWidth: 2,
    borderColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.hero,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
    paddingHorizontal: EPMAPS_SPACING.lg,
    minHeight: 56,
    backgroundColor: EPMAPS_COLORS.bgLight,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  numericInputDanger: {
    borderColor: EPMAPS_COLORS.danger,
    backgroundColor: EPMAPS_COLORS.dangerSoftBg,
    color: EPMAPS_COLORS.danger,
  },
  consumptionBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.successBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.successBorder,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginVertical: EPMAPS_SPACING.sm,
  },
  consumptionBoxDanger: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderColor: EPMAPS_COLORS.dangerBorder,
  },
  consumptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consumptionLabel: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.success,
  },
  consumptionLabelDanger: {
    color: EPMAPS_COLORS.danger,
  },
  consumptionValue: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.lg,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.success,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  consumptionValueDanger: {
    color: EPMAPS_COLORS.danger,
  },
  infoBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginVertical: EPMAPS_SPACING.sm,
  },
  infoBadgePendingText: {
    flex: 1,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.accentDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: EPMAPS_COLORS.bgBlue,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.accentDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    lineHeight: 20,
  },
  dangerAlertBox: {
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerBorder,
    borderRadius: EPMAPS_RADII.md,
    padding: EPMAPS_SPACING.md,
    marginVertical: EPMAPS_SPACING.sm,
  },
  dangerAlertTitle: {
    fontSize: 14,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.danger,
  },
  dangerAlertText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.danger,
    lineHeight: 18,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.medium,
  },
  anomalyBox: {
    backgroundColor: EPMAPS_COLORS.warningBg,
    borderWidth: 1.5,
    borderColor: EPMAPS_COLORS.warningBorder,
    borderRadius: EPMAPS_RADII.lg,
    padding: EPMAPS_SPACING.lg,
    marginVertical: EPMAPS_SPACING.md,
  },
  anomalyTitle: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.textDark,
  },
  anomalyText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textDark,
    lineHeight: 19,
    marginBottom: EPMAPS_SPACING.md,
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.surface,
    paddingHorizontal: EPMAPS_SPACING.md,
    paddingVertical: EPMAPS_SPACING.sm,
    borderRadius: EPMAPS_RADII.md,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.warningBorder,
  },
  checkboxSquare: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: EPMAPS_COLORS.warning,
    borderRadius: EPMAPS_RADII.sm,
    backgroundColor: EPMAPS_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: EPMAPS_SPACING.md,
  },
  checkboxSquareChecked: {
    backgroundColor: EPMAPS_COLORS.warning,
    borderColor: EPMAPS_COLORS.warning,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    lineHeight: 18,
  },
  requirementBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: EPMAPS_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerBorder,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginBottom: EPMAPS_SPACING.lg,
  },
  requirementBannerText: {
    flex: 1,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    lineHeight: 18,
  },
  optionalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: EPMAPS_COLORS.successBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.successBorder,
    padding: EPMAPS_SPACING.md,
    borderRadius: EPMAPS_RADII.md,
    marginBottom: EPMAPS_SPACING.lg,
  },
  optionalBannerText: {
    flex: 1,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.success,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    lineHeight: 18,
  },
  cameraTriggerButton: {
    borderWidth: 2,
    borderColor: EPMAPS_COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: EPMAPS_RADII.lg,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EPMAPS_COLORS.bgBlue,
    padding: EPMAPS_SPACING.lg,
    marginBottom: EPMAPS_SPACING.lg,
  },
  cameraIconCircle: {
    width: 52,
    height: 52,
    borderRadius: EPMAPS_RADII.full,
    backgroundColor: EPMAPS_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: EPMAPS_SPACING.sm,
  },
  cameraTriggerText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
  },
  cameraTriggerSubtext: {
    fontSize: 12,
    color: EPMAPS_COLORS.accentDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    marginTop: 4,
    textAlign: 'center',
  },
  photoPreviewCard: {
    borderRadius: EPMAPS_RADII.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderMedium,
    backgroundColor: EPMAPS_COLORS.surface,
    marginBottom: EPMAPS_SPACING.lg,
  },
  photoPreviewImage: {
    width: '100%',
    height: 220,
    backgroundColor: EPMAPS_COLORS.bgSecondary,
  },
  photoActionsRow: {
    flexDirection: 'row',
    backgroundColor: EPMAPS_COLORS.surface,
    padding: EPMAPS_SPACING.md,
    justifyContent: 'space-between',
    gap: EPMAPS_SPACING.sm,
  },
  retakePhotoButton: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakePhotoButtonText: {
    color: EPMAPS_COLORS.textInverse,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
  },
  deletePhotoButton: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.minHeight,
    backgroundColor: EPMAPS_COLORS.dangerSoftBg,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.dangerSoftBorder,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoButtonText: {
    color: EPMAPS_COLORS.danger,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
  },
  summaryCard: {
    backgroundColor: EPMAPS_COLORS.bgLight,
    padding: EPMAPS_SPACING.lg,
    borderRadius: EPMAPS_RADII.md,
    borderWidth: 1,
    borderColor: EPMAPS_COLORS.borderLight,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.primaryDark,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: EPMAPS_COLORS.borderLight,
    marginVertical: EPMAPS_SPACING.sm,
  },
  summaryItem: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.sm,
    color: EPMAPS_COLORS.textDark,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.semibold,
    marginVertical: 3,
  },
  summaryItemTabular: {
    fontVariant: EPMAPS_TYPOGRAPHY.tabularNums,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: EPMAPS_SPACING.md,
  },
  footerSpacer: {
    flex: 1,
  },
  buttonIconSmall: {
    marginRight: 6,
  },
  buttonIconRight: {
    marginLeft: 6,
  },
  navButtonSecondary: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.buttonHeight,
    backgroundColor: EPMAPS_COLORS.surface,
    borderWidth: 1.5,
    borderColor: EPMAPS_COLORS.borderMedium,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonSecondaryText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.bold,
    color: EPMAPS_COLORS.primaryDark,
  },
  navButtonPrimary: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.buttonHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimaryText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.textInverse,
  },
  navButtonFinish: {
    flex: 1,
    minHeight: EPMAPS_TOUCH.buttonHeight,
    backgroundColor: EPMAPS_COLORS.primary,
    borderRadius: EPMAPS_RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: EPMAPS_SPACING.md,
  },
  finishButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonFinishText: {
    fontSize: EPMAPS_TYPOGRAPHY.sizes.md,
    fontWeight: EPMAPS_TYPOGRAPHY.weights.extrabold,
    color: EPMAPS_COLORS.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

