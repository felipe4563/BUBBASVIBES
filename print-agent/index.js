// Punto de entrada — modo instalador o modo agente

// Silencia el ExperimentalWarning del Fetch API global (usado por el
// instalador para consultar sucursales) — no aporta nada al usuario final.
process.on('warning', (warning) => {
  if (warning.name !== 'ExperimentalWarning') console.warn(warning);
});

const args = process.argv.slice(2);

if (args.includes('--service')) {
  require('./agent');
} else {
  require('./installer');
}
