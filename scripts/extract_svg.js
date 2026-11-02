const fs = require('fs');

function extractPaths(file) {
  const content = fs.readFileSync(file, 'utf8');
  const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
  const pathMatch = content.match(/d="([^"]+)"/g);
  const dList = pathMatch ? pathMatch.map(p => p.slice(3, -1)) : [];
  return { viewBox: viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100', dList };
}

const ciudad = extractPaths('assets/images/ciudad_sin_fondo.svg');
const manoIzq = extractPaths('assets/images/mano_izquieeda_principal.svg');
const manoDer = extractPaths('assets/images/mano_derecha_principal.svg');

fs.writeFileSync('src/components/illustrations/svgData.json', JSON.stringify({ ciudad, manoIzq, manoDer }, null, 2));
console.log('Extraidos datos vectoriales con exito');

