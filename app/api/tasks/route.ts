import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { connectDB, isMongoConfigured } from '@/lib/mongodb';
import { Task, ReminderFrequency } from '@/models/Task';
import { shouldTriggerReminder } from '@/lib/reminder-engine';
import {
  memoryStore,
  generateObjectIdHex,
  seedDefaultTasksForUser,
} from '@/lib/fallback-store';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'inbox';

  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999
  );

  if (isMongoConfigured) {
    await connectDB();
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    const query: Record<string, unknown> = { userId: userObjectId };

    if (view === 'today') {
      query.isCompleted = false;
      query.baseDueDate = { $lte: endOfToday };
    } else if (view === 'upcoming') {
      query.isCompleted = false;
      query.baseDueDate = { $gt: endOfToday };
    }

    const tasks = await Task.find(query)
      .sort({ isCompleted: 1, baseDueDate: 1, createdAt: -1 })
      .lean();

    const dueAlerts = tasks.filter(
      (task) =>
        task.pendingBrowserAlert ||
        shouldTriggerReminder({
          baseDueDate: task.baseDueDate,
          isCompleted: task.isCompleted,
          reminderFrequency: task.reminderFrequency,
          lastNotifiedAt: task.lastNotifiedAt,
          now,
        })
    );

    if (dueAlerts.length > 0) {
      const alertIds = dueAlerts.map((t) => t._id);
      await Task.updateMany(
        { _id: { $in: alertIds }, userId: userObjectId },
        { $set: { lastNotifiedAt: now, pendingBrowserAlert: false } }
      );
    }

    return NextResponse.json({
      tasks,
      dueAlerts: dueAlerts.map((t) => ({
        _id: String(t._id),
        title: t.title,
        baseDueDate: t.baseDueDate,
        reminderFrequency: t.reminderFrequency,
      })),
    });
  }

  // Fallback in-memory multi-tenant isolation
  seedDefaultTasksForUser(session.user.id);

  let userTasks = Array.from(memoryStore.tasks.values()).filter(
    (t) => t.userId === session.user.id
  );

  if (view === 'today') {
    userTasks = userTasks.filter(
      (t) =>
        !t.isCompleted &&
        new Date(t.baseDueDate).getTime() <= endOfToday.getTime()
    );
  } else if (view === 'upcoming') {
    userTasks = userTasks.filter(
      (t) =>
        !t.isCompleted &&
        new Date(t.baseDueDate).getTime() > endOfToday.getTime()
    );
  }

  userTasks.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return (
      new Date(a.baseDueDate).getTime() - new Date(b.baseDueDate).getTime()
    );
  });

  const dueAlerts = userTasks.filter((task) =>
    shouldTriggerReminder({
      baseDueDate: task.baseDueDate,
      isCompleted: task.isCompleted,
      reminderFrequency: task.reminderFrequency,
      lastNotifiedAt: task.lastNotifiedAt,
      now,
    })
  );

  for (const alert of dueAlerts) {
    const existing = memoryStore.tasks.get(alert._id);
    if (existing && existing.userId === session.user.id) {
      existing.lastNotifiedAt = now.toISOString();
      existing.pendingBrowserAlert = false;
      memoryStore.tasks.set(existing._id, existing);
    }
  }

  return NextResponse.json({
    tasks: userTasks,
    dueAlerts: dueAlerts.map((t) => ({
      _id: t._id,
      title: t.title,
      baseDueDate: t.baseDueDate,
      reminderFrequency: t.reminderFrequency,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description = '',
    baseDueDate,
    isRecurring = false,
    reminderFrequency = 'NONE',
  } = body;

  if (!title || typeof title !== 'string' || !baseDueDate) {
    return NextResponse.json(
      { error: 'Title and baseDueDate are required' },
      { status: 400 }
    );
  }

  const validFrequencies: ReminderFrequency[] = [
    'NONE',
    'TWICE_DAILY',
    'THRICE_DAILY',
    'HOURLY',
  ];
  const resolvedFrequency: ReminderFrequency = validFrequencies.includes(
    reminderFrequency
  )
    ? reminderFrequency
    : 'NONE';

  if (isMongoConfigured) {
    await connectDB();

    const task = await Task.create({
      userId: new mongoose.Types.ObjectId(session.user.id),
      title: title.trim(),
      description: description.trim(),
      baseDueDate: new Date(baseDueDate),
      isCompleted: false,
      isRecurring: Boolean(isRecurring),
      recurrenceRule: isRecurring ? 'MONTHLY' : 'NONE',
      reminderFrequency: isRecurring ? resolvedFrequency : 'NONE',
      lastNotifiedAt: null,
      pendingBrowserAlert: false,
    });

    return NextResponse.json({ task }, { status: 201 });
  }

  const nowIso = new Date().toISOString();
  const newTask = {
    _id: generateObjectIdHex(),
    userId: session.user.id,
    title: title.trim(),
    description: description.trim(),
    baseDueDate: new Date(baseDueDate).toISOString(),
    isCompleted: false,
    isRecurring: Boolean(isRecurring),
    recurrenceRule: isRecurring ? 'MONTHLY' : 'NONE' as 'NONE' | 'MONTHLY',
    reminderFrequency: isRecurring ? resolvedFrequency : 'NONE',
    lastNotifiedAt: null,
    pendingBrowserAlert: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  memoryStore.tasks.set(newTask._id, newTask);
  return NextResponse.json({ task: newTask }, { status: 201 });
}
