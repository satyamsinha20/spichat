export default function FriendsPage({
  searchQuery,
  setSearchQuery,
  onSearch,
  searchResults,
  friends,
  requests,
  onSendFriendRequest,
  onRespondRequest,
  onOpenChat,
  isFriendOnline,
}) {
  return (
    <div className="flex-1 overflow-auto px-3 md:px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2">Search friends</h2>
          <form
            onSubmit={onSearch}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-medium"
            >
              Search
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-3 border-t border-slate-800 pt-3 space-y-2 max-h-52 overflow-y-auto">
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-800/70 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {u.profilePic ? (
                      <img
                        src={u.profilePic}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                        {u.name?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[10px] text-slate-400">
                        @{u.username}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onSendFriendRequest(u._id)}
                    className="text-[10px] px-3 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends & requests */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Friends list */}
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Your friends</h2>
              <span className="text-[11px] text-slate-400">
                {friends.length} total
              </span>
            </div>

            {friends.length === 0 ? (
              <p className="text-xs text-slate-500">
                You don't have any friends yet. Search above and send a request.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f._id}
                    onClick={() => onOpenChat(f)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs bg-slate-900 hover:bg-slate-800/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      {f.profilePic ? (
                        <img
                          src={f.profilePic}
                          alt={f.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                          {f.name?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-[12px]">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{f.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-right">
                      {isFriendOnline(f._id) ? (
                        <span className="text-emerald-400">● Online</span>
                      ) : (
                        <span className="text-slate-500">Offline</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Friend requests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold mb-2">Friend requests</h2>
            {requests.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No pending requests.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-2 hover:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-2">
                      {r.from.profilePic ? (
                        <img
                          src={r.from.profilePic}
                          alt={r.from.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                          {r.from.name?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{r.from.name}</div>
                        <div className="text-[10px] text-slate-400">
                          @{r.from.username}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onRespondRequest(r._id, "accept")}
                        className="px-2 py-1 rounded bg-emerald-600 text-[10px]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => onRespondRequest(r._id, "reject")}
                        className="px-2 py-1 rounded bg-slate-800 text-[10px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
