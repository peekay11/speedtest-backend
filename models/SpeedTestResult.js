import mongoose from 'mongoose';

const SpeedTestResultSchema = new mongoose.Schema({
  country: { type: String, required: true },
  download: { type: Number, required: true },
  upload: { type: Number, required: true },
  ping: { type: Number },
  jitter: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('SpeedTestResult', SpeedTestResultSchema, 'speedtestaa');
