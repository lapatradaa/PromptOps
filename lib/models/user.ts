// lib/models/user.ts
import { Schema, model, models } from 'mongoose';

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: String,
  image: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = models.User || model('User', userSchema);