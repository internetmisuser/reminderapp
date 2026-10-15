        {toastMessage && (
          <div className='fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-xs font-medium text-white shadow-lg'>
            <Sparkles className='h-4 w-4 text-emerald-400' />
            {toastMessage}
          </div>
        )}

        <header className='flex items-baseline justify-between mb-6'>
          <div>
            <h1 className='text-2xl font-bold capitalize text-stone-900'>{activeView}</h1>
            <p className='text-xs text-stone-500 mt-0.5'>{new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}</p>
          </div>
          {!showAddForm && (
            <button
              type='button'
              onClick={() => setShowAddForm(true)}
              className='inline-flex items-center gap-1.5 rounded-lg bg-[#de4c4a] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#c53d3b] transition shadow-sm'
            >
              <Plus className='h-4 w-4' />
              New Task
            </button>
          )}
        </header>

        {/* Todoist-Style Inline Task Composer */}
        {showAddForm && (
          <form
            onSubmit={handleCreateTask}
            className='mb-8 rounded-xl border border-stone-300 bg-white p-4 shadow-sm space-y-3'
          >
            <input
              type='text'
              required
              placeholder='Task name (e.g., Pay AWS & Vercel Monthly Invoice)'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='w-full text-sm font-semibold text-stone-900 placeholder-stone-400 focus:outline-none'
            />
            <textarea
              rows={2}
              placeholder='Description or notes...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full text-xs text-stone-600 placeholder-stone-400 focus:outline-none resize-none'
            />

            <div className='flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100'>
              <div className='flex items-center gap-1.5 text-xs text-stone-700 bg-stone-100 px-2.5 py-1.5 rounded-lg'>
                <Clock className='h-3.5 w-3.5 text-stone-500' />
                <input
                  type='datetime-local'
                  value={baseDueDate}
                  onChange={(e) => setBaseDueDate(e.target.value)}
                  className='bg-transparent text-xs focus:outline-none'
                />
              </div>

              <label className='inline-flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer select-none bg-stone-100 px-2.5 py-1.5 rounded-lg'>
                <input
                  type='checkbox'
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className='rounded text-[#de4c4a] focus:ring-[#de4c4a]'
                />
                <Repeat className='h-3.5 w-3.5 text-[#de4c4a]' />
                Monthly Recurring + High-Frequency Persistence
              </label>
            </div>

            {isRecurring && (
              <div className='rounded-lg bg-red-50/60 border border-red-200/80 p-3 space-y-2'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-red-900'>
                  <BellRing className='h-3.5 w-3.5 text-[#de4c4a]' />
                  <span>Overdue Persistent Notification Interval:</span>
                </div>
                <select
                  value={reminderFrequency}
                  onChange={(e) =>
                    setReminderFrequency(e.target.value as ReminderFrequency)
                  }
                  className='w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#de4c4a]'
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.sublabel}
                    </option>
                  ))}
                </select>
                <p className='text-[11px] text-stone-600'>
                  If this monthly task goes past its due time, desktop notifications will persistently fire on this schedule until marked complete (which automatically rolls the due date to next month).
                </p>
              </div>
            )}

            <div className='flex items-center justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setShowAddForm(false)}
                className='rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200'
              >
                Cancel
              </button>
              <button
                type='submit'
                className='rounded-lg bg-[#de4c4a] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#c53d3b]'
              >
                Add task
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        {loading ? (
          <div className='space-y-3'>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className='h-14 rounded-xl bg-stone-100 animate-pulse'
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className='text-center py-16 border border-dashed border-stone-200 rounded-2xl'>
            <p className='text-sm font-medium text-stone-700'>
              All clear in {activeView}!
            </p>
            <p className='text-xs text-stone-500 mt-1'>
              Add a task or configure a recurring monthly reminder above.
            </p>
          </div>
        ) : (
          <ul className='divide-y divide-stone-100'>
            {tasks.map((task) => {
              const isOverdue =
                !task.isCompleted &&
                new Date(task.baseDueDate).getTime() < Date.now();

              return (
                <li
                  key={task._id}
                  className='group flex items-start justify-between gap-3 py-3.5 hover:bg-stone-50/80 px-2 rounded-xl transition'
                >
                  <div className='flex items-start gap-3 min-w-0'>
                    <button
                      type='button'
                      onClick={() => handleCompleteTask(task._id)}
                      title={
                        task.isRecurring
                          ? 'Complete & advance to next calendar month'
                          : 'Mark complete'
                      }
                      className='{`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ` + (isOverdue ? 'border-red-500 bg-red-50 hover:bg-red-500 hover:text-white text-transparent' : 'border-stone-400 hover:border-[#de4c4a] hover:bg-red-50 text-transparent hover:text-[#de4c4a]')
                    }>
                      <Check className='h-3 w-3 stroke-[3]' />
                    </button>

                    <div className='min-w-0'>
                      <p
        className={'text-sm font-medium ' + (task.isCompleted ? 'line-through text-stone-400' : 'text-stone-900')}
      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className='text-xs text-stone-500 mt-0.5 line-clamp-2'>{task.description}</p>
                      )}

                      <div className='flex flex-wrap items-center gap-2 mt-1.5'>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ' + (isOverdue ? 'text-red-600 font-semibold' : 'text-stone-500')}
                        >
                          <Calendar className='h-3 w-3' />
                          {new Date(task.baseDueDate).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {isOverdue && ' (Overdue)'}
                        </span>

                        {task.isRecurring && (
                          <span className='inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-800'>
                            <Repeat className='h-2.5 w-2.5' />
                            Monthly • {task.reminderFrequency.replace('_', ' ')})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={() => handleDeleteTask(task._id)}
                    className='opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-red-600 transition'
                    aria-label='Delete task'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
