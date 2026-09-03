const querysHRO = require('./querys_hro');

// Mapa de consultas por empresa (empresa y hro referencian al mismo módulo)
const companyQueries = {
  hro: querysHRO,
  empresa: querysHRO, // Alias para retrocompatibilidad con SQL Server
  ferroq: require('./querys_ferroq'),
  parcela: require('./querys_parcela'),
};

function getCompanyQueries(companySlug = 'hro') {
  const slug = companySlug.toLowerCase();
  return companyQueries[slug] || querysHRO;
}

module.exports = getCompanyQueries;