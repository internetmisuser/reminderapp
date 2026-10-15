import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { connectDB, isMongoConfigured } from '@/lib/mongodb';
import { Task } from '@/models/Task';
import { advanceToNextCalendarMonth } from '@/lib/reminder-engine';
import { memoryStore } from '@/lib/fallback-store';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  if (isMongoConfigured) {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    await connectDB();
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    const existingTask = await Task.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      userId: userObjectId,
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (body.action === 'complete' || body.isCompleted === true) {
      if (existingTask.isRecurring && existingTask.recurrenceRule === 'MONTHLY') {
        const nextDueDate = advanceToNextCalendarMonth(existingTask.baseDueDate);
        existingTask.baseDueDate = nextDueDate;
        existingTask.isCompleted = false;
        existingTask.lastNotifiedAt = null;
        existingTask.pendingBrowserAlert = false;
        await existingTask.save();

        return NextResponse.json({
          task: existingTask,
          rolledOverToNextMonth: true,
          nextDueDate,
        });
      } else {
        existingTask.isCompleted = true;
        existingTask.pendingBrowserAlert = false;
        await existingTask.save();

        return NextResponse.json({
          task: existingTask,
          rolledOverToNextMonth: false,
        });
      }
    }

    if (typeof body.isCompleted === 'boolean') {
      existingTask.isCompleted = body.isCompleted;
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      existingTask.title = body.title.trim();
    }
    if (typeof body.description === 'string') {
      existingTask.description = body.description.trim();
    }
    if (body.baseDueDate) {
      existingTask.baseDueDate = new Date(body.baseDueDate);
      existingTask.lastNotifiedAt = null;
    }
    if (typeof body.isRecurring === 'boolean') {
      existingTask.isRecurring = body.isRecurring;
      existingTask.recurrenceRule = body.isRecurring ? 'MONTHLY' : 'NONE';
    }
    if (body.reminderFrequency) {
      existingTask.reminderFrequency = body.reminderFrequency;
    }

    await existingTask.save();
    return NextResponse.json({ task: existingTask });
  }

  // Fallback memory store
  const memTask = memoryStore.tasks.get(params.id);
  if (!memTask || memTask.userId !== session.user.id) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (body.action === 'complete' || body.isCompleted === true) {
    if (memTask.isRecurring && memTask.recurrenceRule === 'MONTHLY') {
      const nextDueDate = advanceToNextCalendarMonth(memTask.baseDueDate);
      memTask.baseDueDate = nextDueDate.toISOString();
      memTask.isCompleted = false;
      memTask.lastNotifiedAt = null;
      memTask.pendingBrowserAlert = false;
      memTask.updatedAt = new Date().toISOString();
      memoryStore.tasks.set(memTask._id, memTask);

      return NextResponse.json({
        task: memTask,
        rolledOverToNextMonth: true,
        nextDueDate: memTask.baseDueDate,
      });
    } else {
      memTask.isCompleted = true;
      memTask.pendingBrowserAlert = false;
      memTask.updatedAt = new Date().toISOString();
      memoryStore.tasks.set(memTask._id, memTask);

      return NextResponse.json({
        task: memTask,
        rolledOverToNextMonth: false,
      });
    }
  }

  if (typeof body.isCompleted === 'boolean') {
    memTask.isCompleted = body.isCompleted;
  }
  if (typeof body.title === 'string' && body.title.trim()) {
    memTask.title = body.title.trim();
  }
  if (typeof body.description === 'string') {
    memTask.description = body.description.trim();
  }
  if (body.baseDueDate) {
    memTask.baseDueDate = new Date(body.baseDueDate).toISOString();
    memTask.lastNotifiedAt = null;
  }
  if (typeof body.isRecurring === 'boolean') {
    memTask.isRecurring = body.isRecurring;
    memTask.recurrenceRule = body.isRecurring ? 'MONTHLY' : 'NONE';
  }
  if (body.reminderFrequency) {
    memTask.reminderFrequency = body.reminderFrequency;
  }
  memTask.updatedAt = new Date().toISOString();
  memoryStore.tasks.set(memTask._id, memTask);

  return NextResponse.json({ task: memTask });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isMongoConfigured) {
    await connectDB();
    const deleted = await Task.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  }

  const memTask = memoryStore.tasks.get(params.id);
  if (!memTask || memTask.userId !== session.user.id) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  memoryStore.tasks.delete(params.id);
  return NextResponse.json({ deleted: true });
}
