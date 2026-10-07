// arranque.js — Inicio de sesiones de práctica/repaso desde cualquier pantalla
// (configuración, Explorar, Progreso, resumen), con confirmación si ya hay una en curso.

import { iniciarPractica, sesionEnCurso } from '../sesion.js';
import { navegar } from '../router.js';
import { confirmar } from './modal.js';
import { toast } from './toast.js';

/**
 * @param {{tipo?:'practica'|'repaso', examen:string, ids:string[], titulo:string, config?:object}} op
 * @returns {Promise<boolean>}
 */
export async function arrancarPractica(op) {
  if (!op.ids || !op.ids.length) {
    toast('No hay preguntas disponibles con esos filtros.', { tipo: 'error' });
    return false;
  }
  if (sesionEnCurso('practica')) {
    const ok = await confirmar({
      titulo: 'Tienes una sesión en curso',
      texto: '¿Cerrarla y empezar una nueva? Las respuestas que ya diste quedan registradas en tu progreso.',
      aceptar: 'Empezar nueva',
      cancelar: 'Cancelar',
    });
    if (!ok) return false;
  }
  iniciarPractica(op);
  navegar('/practica/sesion');
  return true;
}
