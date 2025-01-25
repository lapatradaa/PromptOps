// lib/models/project.ts
import { Schema, model, models } from 'mongoose';

const systemContentSchema = new Schema({
    type: {
        type: String,
        enum: ['qa', 'none', 'custom'],
        required: true
    },
    content: String
});

const projectSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    llm: {
        type: String,
        required: true
    },
    apiKey: String,
    systemContent: systemContentSchema,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Project = models.Project || model('Project', projectSchema);