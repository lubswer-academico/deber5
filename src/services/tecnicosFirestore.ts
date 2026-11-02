import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface TecnicoDoc {
  uid: string;
  nombre: string;
  apellido: string;
  correo: string;
  codigo: string;
  distrito: string;
  creadoEn: string;
}

export async function buscarTecnicoPorIdentificador(identificador: string): Promise<TecnicoDoc | null> {
  const limpio = identificador.trim();
  const colRef = collection(db, 'tecnicos');

  if (limpio.includes('@')) {
    const q = query(colRef, where('correo', '==', limpio.toLowerCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as TecnicoDoc;
    }
  } else {
    const q = query(colRef, where('codigo', '==', limpio.toUpperCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as TecnicoDoc;
    }
  }

  return null;
}

export async function generarSiguienteCodigoTecnico(): Promise<string> {
  const colRef = collection(db, 'tecnicos');
  const snapshot = await getDocs(query(colRef));

  let maxNumero = 0;
  snapshot.forEach((documento) => {
    const data = documento.data();
    const codigo = data.codigo as string | undefined;
    if (codigo && codigo.startsWith('TEC-')) {
      const numStr = codigo.replace('TEC-', '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNumero) {
        maxNumero = num;
      }
    }
  });

  const siguienteNumero = maxNumero + 1;
  const codigoPadded = String(siguienteNumero).padStart(3, '0');
  return `TEC-${codigoPadded}`;
}

export async function registrarDatosTecnicoEnFirestore(datos: {
  uid: string;
  nombre: string;
  apellido: string;
  correo: string;
  codigo: string;
  distrito?: string;
}): Promise<TecnicoDoc> {
  const docRef = doc(db, 'tecnicos', datos.uid);
  const nuevoTecnico: TecnicoDoc = {
    uid: datos.uid,
    nombre: datos.nombre,
    apellido: datos.apellido,
    correo: datos.correo.toLowerCase().trim(),
    codigo: datos.codigo,
    distrito: datos.distrito || 'Sin distrito asignado',
    creadoEn: new Date().toISOString(),
  };

  await setDoc(docRef, nuevoTecnico);
  return nuevoTecnico;
}

