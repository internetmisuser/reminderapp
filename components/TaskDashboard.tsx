  const [activeView, setActiveView] = useState<ViewType>('today');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dueAlerts, setDueAlerts] = useState<DueAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox className='h-4 w-4 text-blue-600' /> },
    { id: 'today', label: 'Today', icon: <Calendar className='h-4 w-4 text-emerald-600' /> },
    { id: 'upcoming', label: 'Upcoming', icon: <CalendarDays className='h-4 w-4 text-purple-600' /> },
  ];

  return (
    <div className='min-h-screen bg-white flex text-stone-900'>
      {/* Mobile Header */}
      <div className='lg:hidden fixed top-0 inset-x-0 h-14 bg-[#faf8f7] border-b border-stone-200 flex items-center justify-between px-4 z-30'>
        <button
          type='button'
          onClick={() => setSidebarOpen(true)}
          className='p-2 rounded-lg text-stone-700 hover:bg-stone-200/60'
        >
          <Menu className='h-5 w-5' />
        </button>
        <span className='font-semibold text-sm capitalize'>{activeView}</span>
        <button
          type='button'
          onClick={() => setShowAddForm(true)}
          className='p-1.5 rounded-lg bg-[#de4c4a] text-white'
        >
          <Plus className='h-4 w-4' />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className='fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#faf8f7] border-r border-stone-200/80 flex flex-col justify-between p-4 transition-transform duration-200 '
      >
        <div>
          <div className='flex items-center justify-between mb-6 px-2'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='h-7 w-7 rounded-full bg-[#de4c4a] text-white flex items-center justify-center text-xs font-bold shrink-0'>
                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className='truncate'>
                <p className='text-sm font-semibold text-stone-900 truncate'>{session?.user?.name || session?.user?.email}</p>
                <p className='text-[11px] text-stone-500 truncate'>{session?.user?.email}</p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setSidebarOpen(false)}
              className='lg:hidden p-1 text-stone-500'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <button
            type='button'
            onClick={() => {
              setShowAddForm(true);
              setSidebarOpen(false);
            }}
            className='w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-[#de4c4a] hover:bg-red-50/80 transition mb-3'
          >
            <span className='h-5 w-5 rounded-full bg-[#de4c4a] text-white flex items-center justify-center'>
              <Plus className='h-3.5 w-3.5 stroke-[2.5]' />
            </span>
            Add task
          </button>

          <nav className='space-y-1'>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setSidebarOpen(false);
                }}
                className='w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition '
              >
                <span className='flex items-center gap-3'>
                  {item.icon}
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <button
          type='button'
          onClick={() => signOut()}
          className='flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-200/60 transition'
        >
          <LogOut className='h-4 w-4' />
          Sign out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className='flex-1 max-w-3xl mx-auto px-4 sm:px-8 pt-20 lg:pt-12 pb-20'>
