import { NextRequest, NextResponse } from 'next/server';
import { connectDB, isMongoConfigured } from '@/lib/mongodb';
import { Task } from '@/models/Task';
import { shouldTriggerReminder } from '@/lib/reminder-engine';
import { memoryStore } from '@/lib/fallback-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();

  if (isMongoConfigured) {
    await connectDB();

    const overdueCandidates = await Task.find({
      isCompleted: false,
      reminderFrequency: { $in: ['TWICE_DAILY', 'THRICE_DAILY', 'HOURLY'] },
      baseDueDate: { $lt: now },
    }).lean();

    const tasksToAlert = overdueCandidates.filter((task) =>
      shouldTriggerReminder({
        baseDueDate: task.baseDueDate,
        isCompleted: task.isCompleted,
        reminderFrequency: task.reminderFrequency,
        lastNotifiedAt: task.lastNotifiedAt,
        now,
      })
    );

    if (tasksToAlert.length > 0) {
      const ids = tasksToAlert.map((t) => t._id);
      await Task.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            pendingBrowserAlert: true,
            lastNotifiedAt: now,
          },
        }
      );
    }

    const summaryByUser = tasksToAlert.reduce<Record<string, number>>(
      (acc, t) => {
        const uid = String(t.userId);
        acc[uid] = (acc[uid] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      ok: true,
      evaluatedAt: now.toISOString(),
      candidatesScanned: overdueCandidates.length,
      notificationsQueued: tasksToAlert.length,
      usersAffected: Object.keys(summaryByUser).length,
      summaryByUser,
    });
  }

  // Fallback memory evaluation
  const overdueCandidates = Array.from(memoryStore.tasks.values()).filter(
    (t) =>
      !t.isCompleted &&
      t.reminderFrequency !== 'NONE' &&
      new Date(t.baseDueDate).getTime() < now.getTime()
  );

  const tasksToAlert = overdueCandidates.filter((task) =>
    shouldTriggerReminder({
      baseDueDate: task.baseDueDate,
      isCompleted: task.isCompleted,
      reminderFrequency: task.reminderFrequency,
      lastNotifiedAt: task.lastNotifiedAt,
      now,
    })
  );

  for (const t of tasksToAlert) {
    t.pendingBrowserAlert = true;
    t.lastNotifiedAt = now.toISOString();
    memoryStore.tasks.set(t._id, t);
  }

  const summaryByUser = tasksToAlert.reduce<Record<string, number>>((acc, t) => {
    acc[t.userId] = (acc[t.userId] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    evaluatedAt: now.toISOString(),
    candidatesScanned: overdueCandidates.length,
    notificationsQueued: tasksToAlert.length,
    usersAffected: Object.keys(summaryByUser).length,
    summaryByUser,
  });
}
