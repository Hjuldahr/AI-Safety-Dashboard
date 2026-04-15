import SystemSetting from './SystemSetting.js';

const get = async (key, defaultValue = null) => {
  const setting = await SystemSetting.findOne({ key }).lean();
  if (!setting) return defaultValue;
  return setting.value;
};

const set = async (key, value) => {
  return SystemSetting.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true }
  );
};

export default {
  get,
  set
};