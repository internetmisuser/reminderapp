'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, BellRing, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface DueAlert {
  _id: string;
  title: string;
  baseDueDate: string;
  reminderFrequency: 'NONE' | 'TWICE_DAILY' | 'THRICE_DAILY' | 'HOURLY';
}

interface NotificationManagerProps {
  activeAlerts: DueAlert[];
  onCompleteTask: (taskId: string) => Promise<void>;
}

const FREQUENCY_LABELS: Record<DueAlert['reminderFrequency'], string> = {
  NONE: 'Standard',
  TWICE_DAILY: '2x Daily (9 AM / 6 PM)',
  THRICE_DAILY: '3x Daily (9 AM / 2 PM / 7 PM)',
  HOURLY: 'Hourly (8 AM - 8 PM)',
};

export default function NotificationManager({
  activeAlerts,
  onCompleteTask,
}: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  useEffect(() => {
    if (
      !supported ||
      permission !== 'granted' ||
      activeAlerts.length === 0
    ) {
      return;
    }

    activeAlerts.forEach((alert) => {
      try {
        const notification = new Notification(
          `Overdue Monthly Task: ${alert.title}`,
          {
            body: `Persistent Reminder (${FREQUENCY_LABELS[alert.reminderFrequency]}). Mark complete to advance to next month.`,
            tag: `persistent-task-${alert._id}`,
            requireInteraction: true,
          }
        );

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Fallback when Notification constructor is restricted in some embedded contexts
      }
    });
  }, [activeAlerts, permission, supported]);

  return (
    <div className='space-y-2.5 mb-6'>
      {supported && permission !== 'granted' && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm'>
          <div className='flex items-center gap-2.5'>
            <Bell className='h-4 w-4 text-amber-600 shrink-0' />
            <span className='text-xs sm:text-sm'>
              Enable <strong>Desktop Notifications</strong> so overdue recurring tasks alert you on your selected schedule.
            </span>
          </div>
          <button
            type='button'
            onClick={requestPermission}
            className='shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition'
          >
            Enable Alerts
          </button>
        </div>
      )}

      {activeAlerts.length > 0 && (
        <div className='rounded-xl border border-red-200 bg-red-50/95 p-4 shadow-sm'>
          <div className='flex items-center gap-2 text-red-800 font-semibold text-sm mb-2.5'>
            <BellRing className='h-4 w-4 text-red-600 animate-bounce' />
            <span>
              Persistent Overdue Reminders Active ({activeAlerts.length})
            </span>
          </div>
          <div className='space-y-2'>
            {activeAlerts.map((alert) => (
              <div
                key={alert._id}
                className='flex flex-wrap items-center justify-between rounded-lg bg-white/95 px-3.5 py-2.5 border border-red-100'
              >
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-stone-900 truncate'>
                    {alert.title}
                  </p>
                  <p className='text-xs text-red-600 flex items-center gap-1 mt-0.5'>
                    <AlertTriangle className='h-3 w-3 shrink-0' />
                    <span>
                      {FREQUENCY_LABELS[alert.reminderFrequency]} • Due{' '}
                      {new Date(alert.baseDueDate).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => onCompleteTask(alert._id)}
                  className='inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition shrink-0 shadow-sm'
                >
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  Complete & Roll to Next Month
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
