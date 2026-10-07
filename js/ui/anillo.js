// anillo.js — Anillos de progreso en SVG: el anillo genérico y la «brújula» de la meta diaria
// (rosa de rumbos con marcas cada 6° y la flecha del norte en oro).

/**
 * Anillo de progreso simple.
 * @param {{valor:number|null, tam?:number, grosor?:number, texto?:string, color?:string, etiqueta?:string}} op
 */
export function anillo({ valor, tam = 64, grosor = 7, texto = '', color = 'var(--oro-marca)', etiqueta = '' }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const v = valor === null || valor === undefined ? 0 : Math.max(0, Math.min(1, valor));
  const arco = v > 0
    ? `<circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${grosor}"
        stroke-linecap="round" stroke-dasharray="${(c * v).toFixed(2)} ${c.toFixed(2)}"
        transform="rotate(-90 ${tam / 2} ${tam / 2})"/>`
    : '';
  return `<svg class="anillo" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="${etiqueta}">
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--pista)" stroke-width="${grosor}"/>
    ${arco}
    ${texto ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${Math.round(tam * 0.24)}">${texto}</text>` : ''}
  </svg>`;
}

/**
 * Brújula de la meta diaria (136 px).
 * @param {number} valor 0..1
 */
export function brujula(valor) {
  const t = 136;
  const c = t / 2;
  const marcas = [];
  for (let i = 0; i < 60; i++) {
    const mayor = i % 5 === 0;
    const ang = (i * 6 * Math.PI) / 180;
    const r1 = 64;
    const r2 = mayor ? 57 : 60;
    const x1 = c + r1 * Math.sin(ang);
    const y1 = c - r1 * Math.cos(ang);
    const x2 = c + r2 * Math.sin(ang);
    const y2 = c - r2 * Math.cos(ang);
    if (i === 0) continue; // el norte lleva la flecha
    marcas.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
      stroke="currentColor" stroke-opacity="${mayor ? 0.55 : 0.28}" stroke-width="${mayor ? 1.6 : 1.1}" stroke-linecap="round"/>`);
  }
  const r = 47;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor || 0));
  const arco = v > 0
    ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#D4AF37" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${(circ * v).toFixed(2)} ${circ.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`
    : '';
  return `<svg viewBox="0 0 ${t} ${t}" aria-hidden="true" focusable="false">
    ${marcas.join('')}
    <path d="M${c} 1 L${c + 4.6} 9 L${c - 4.6} 9 Z" fill="#D4AF37"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.13" stroke-width="9"/>
    ${arco}
  </svg>`;
}
