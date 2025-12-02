export default function DashboardHome({
  user,
  friendsCount,
  requestsCount,
  onlineCount,
  onGoFriends,
  onGoChat,
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 overflow-auto">
      <div className="w-full max-w-3xl">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-lg">
          <h1 className="text-xl md:text-2xl font-semibold mb-2">
            Hi, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Welcome to your real-time chat dashboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Friends"
              value={friendsCount}
              helper="People you can chat with."
            />
            <StatCard
              label="Pending requests"
              value={requestsCount}
              helper="New people want to connect."
            />
            <StatCard
              label="Online friends"
              value={onlineCount}
              helper="Available to chat right now."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onGoFriends}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
            >
              View friends & requests
            </button>
            <button
              onClick={onGoChat}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-xs"
            >
              Open recent chats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{helper}</div>
    </div>
  );
}
