const { GarminConnect } = require('@flow-js/garmin-connect');
exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!email || !password) return { statusCode: 200, headers, body: JSON.stringify({ error: 'Garmin credentials not set' }) };
  try {
    const GCClient = new GarminConnect({ username: email, password });
    await GCClient.login();
    const today = new Date().toISOString().split('T')[0];
    const [stats, sleep, hr] = await Promise.allSettled([GCClient.getDailyS
cd ~/Downloads/jm-dashboard && cat > netlify/functions/garmin.js << 'EOF'
const { GarminConnect } = require('@flow-js/garmin-connect');
exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!email || !password) return { statusCode: 200, headers, body: JSON.stringify({ error: 'Garmin credentials not set' }) };
  try {
    const GCClient = new GarminConnect({ username: email, password });
    await GCClient.login();
    const today = new Date().toISOString().split('T')[0];
    const [stats, sleep, hr] = await Promise.allSettled([GCClient.getDailyS

