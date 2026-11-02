import { AuthenticatedTechnician, SessionValidationResult, TechnicianCredentials } from './types';

export function sanitizeEmployeeCode(code: string): string {
  return code.trim();
}

export function validateCredentialsFormat(
  code: string,
  pin: string
): { isValid: boolean; errorMessage?: string } {
  const sanitizedCode = sanitizeEmployeeCode(code);
  const sanitizedPin = pin.trim();

  if (!sanitizedCode || !sanitizedPin) {
    return {
      isValid: false,
      errorMessage: 'Debe ingresar el código de empleado y la clave.',
    };
  }

  return { isValid: true };
}

export function authenticateTechnician(
  code: string,
  pin: string,
  catalog: readonly TechnicianCredentials[]
): SessionValidationResult {
  const formatValidation = validateCredentialsFormat(code, pin);
  if (!formatValidation.isValid) {
    return {
      success: false,
      errorMessage: formatValidation.errorMessage,
    };
  }

  const sanitizedCode = sanitizeEmployeeCode(code);
  const matched = catalog.find(
    (tech) => tech.employeeCode === sanitizedCode && tech.pin === pin
  );

  if (!matched) {
    return {
      success: false,
      errorMessage: 'Código de empleado o clave incorrectos.',
    };
  }

  const technician: AuthenticatedTechnician = {
    employeeCode: matched.employeeCode,
    name: matched.name,
  };

  return {
    success: true,
    technician,
  };
}
