import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReminderFrequency = 'NONE' | 'TWICE_DAILY' | 'THRICE_DAILY' | 'HOURLY';

export type RecurrenceRule = 'NONE' | 'MONTHLY';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  baseDueDate: Date;
  isCompleted: boolean;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule;
  reminderFrequency: ReminderFrequency;
  lastNotifiedAt: Date | null;
  pendingBrowserAlert: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: 240,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    baseDueDate: {
      type: Date,
      required: true,
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceRule: {
      type: String,
      enum: ['NONE', 'MONTHLY'],
      default: 'NONE',
    },
    reminderFrequency: {
      type: String,
      enum: ['NONE', 'TWICE_DAILY', 'THRICE_DAILY', 'HOURLY'],
      default: 'NONE',
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
    pendingBrowserAlert: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, isCompleted: 1, baseDueDate: 1 });
TaskSchema.index({ isCompleted: 1, reminderFrequency: 1, baseDueDate: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
