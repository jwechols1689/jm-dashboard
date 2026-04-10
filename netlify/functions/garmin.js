const { GarminConnect } = require('garmin-connect');

exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!email || !password) return { statusCode: 200, headers, body: JSON.stringify({ error: 'Garmin credentials not set' }) };
  try {
    const GCClient = new GarminConnect({ username: email, password });
    await GCClient.login();
    const today = new Date().toISOString().split('T')[0];
    const [stats, sleep, hr] = await Promise.allSettled([
      GCClient.getDailyStats(today),
      GCClient.getSleep(today),
      GCClient.getHeartRate(today)
    ]);
    const s = stats.status === 'fulfilled' ? stats.value : null;
    const sl = sleep.status === 'fulfilled' ? sleep.value : null;
    const h = hr.status === 'fulfilled' ? hr.value : null;
    const bodyBattery = s?.bodyBatteryChargedValue || null;
    const sleepHours = sl?.dailySleepDTO?.sleepTimeSeconds ? Math.round(sl.dailySleepDTO.sleepTimeSeconds / 360) / 10 : null;
    const restingHR = h?.restingHeartRate || s?.restingHeartRate || null;
    const avgStress = s?.averageStressLevel || null;
    const steps = s?.totalSteps || null;
    return { statusCode: 200, headers, body: JSON.stringify({ bodyBattery, sleepHours, restingHR, avgStress, steps }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message }) };
  }
};
