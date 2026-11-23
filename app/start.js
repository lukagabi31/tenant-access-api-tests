const { createApp } = require('./server');

const port = Number(process.env.PORT || 3000);
const fixed = process.env.APP_MODE === 'fixed';

createApp({ fixed }).listen(port, () => {
  console.log(`Project API (${fixed ? 'fixed' : 'vulnerable'} build) listening on http://localhost:${port}`);
});
