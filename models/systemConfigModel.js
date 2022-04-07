const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema({
  system_config_key: {
    type: String,
    required: [true, "key is required."],
  },
  system_config_value: {
    type: String,
    required: [true, "value is required."],
  },
});

const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

module.exports = SystemConfig;
