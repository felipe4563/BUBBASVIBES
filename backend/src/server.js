require('dotenv').config({ quiet: true });
const http = require('http');
const app = require('./app');
const { init: initSocket } = require('./socket');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
initSocket(server);

sequelize.authenticate()
  .then(() => {
    console.log('DB conectada');
    server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
  })
  .catch(err => {
    console.error('Error DB:', err);
    process.exit(1);
  });
