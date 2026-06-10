import mongoose from 'mongoose';

const envSettingSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  value: { 
    type: String, 
    required: true 
  },
  isEncrypted: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

const EnvSetting = mongoose.model('EnvSetting', envSettingSchema);

export default EnvSetting;
