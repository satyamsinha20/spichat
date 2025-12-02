import { useEffect, useRef } from "react";

export default function ChatPage({
  user,
  conversations,
  selectedFriend,
  messages,
  loadingChat,
  sendingMsg,
  msgInputRef,
  onSendMessage,
  onOpenChat,
  onBackHome,
  isFriendOnline,
  onDeleteMessage,
  lastMyMessageId,
}) {
  // 👇 last message tak scroll karne ke liye ref
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth", // agar instant jump chahiye to "auto" kar dena
      });
    }
  };

  // jab bhi messages change hon ya selectedFriend change ho → neeche scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedFriend]);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-950 overflow-hidden">
      {/* LEFT: recent chats list */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/70 h-48 md:h-full overflow-y-auto">
        <div className="px-3 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent chats</h2>
          <span className="text-[10px] text-slate-400">
            {conversations.length} chats
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="px-3 py-3 text-[11px] text-slate-500">
            No conversations yet. Start a chat from Friends page.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => {
              const partner = conv.participants.find(
                (p) => p._id !== user._id
              );
              const isActive =
                selectedFriend && partner && selectedFriend._id === partner._id;

              return (
                <button
                  key={conv._id}
                  onClick={() => onOpenChat(partner, conv._id)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left text-xs hover:bg-slate-800/80 ${
                    isActive ? "bg-slate-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {partner?.profilePic ? (
                      <img
                        src={partner.profilePic}
                        alt={partner.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                        {partner?.name?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-[12px]">
                        {partner?.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        @{partner?.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px]">
                    {partner && isFriendOnline(partner._id) ? (
                      <span className="text-emerald-400">● Online</span>
                    ) : (
                      <span className="text-slate-500">Offline</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* RIGHT: chat window */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3 md:px-4 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden mr-1 px-2 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-900"
              onClick={onBackHome}
            >
              ← Back
            </button>

            {selectedFriend ? (
              <>
                {selectedFriend.profilePic ? (
                  <img
                    src={selectedFriend.profilePic}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                    {selectedFriend.name?.[0]}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">
                    {selectedFriend.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    @{selectedFriend.username} ·{" "}
                    {isFriendOnline(selectedFriend._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-xs text-slate-500">
                Select a conversation from the left
              </span>
            )}
          </div>

          <button
            className="hidden md:inline-flex px-2 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-900"
            onClick={onBackHome}
          >
            Back to dashboard
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
          {loadingChat ? (
            <div className="text-xs text-slate-500 text-center mt-4">
              Loading chat...
            </div>
          ) : !selectedFriend ? (
            <div className="text-xs text-slate-500 text-center mt-4">
              Select a conversation from the left to start chatting.
            </div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-slate-500 text-center mt-4">
              No messages yet. Say hi 👋
            </div>
          ) : (
            <>
              {messages.map((m) => {
                const isMe =
                  m.sender === user._id || m.sender?._id === user._id;
                const showDeleted = m.isDeleted;
                const timeStr = new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isLastMyMessage = isMe && m._id === lastMyMessageId;

                return (
                  <div
                    key={m._id}
                    className={`flex ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="flex items-end gap-1 max-w-xs md:max-w-md">
                      {!isMe && (
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[9px]">
                          {selectedFriend?.name?.[0]}
                        </div>
                      )}

                      <div
                        className={`px-3 py-2 rounded-2xl text-xs shadow-sm ${
                          isMe
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : "bg-slate-800 text-slate-100 rounded-bl-sm"
                        }`}
                      >
                        <div
                          className={
                            showDeleted ? "italic text-slate-300/70" : ""
                          }
                        >
                          {showDeleted
                            ? "This message was deleted"
                            : m.text}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] mt-1 text-slate-300/70">
                          <span>{timeStr}</span>
                          {isMe && isLastMyMessage && (
                            <span>{m.seen ? "✓✓ seen" : "✓ sent"}</span>
                          )}
                        </div>
                      </div>

                      {isMe && !showDeleted && (
                        <button
                          onClick={() => onDeleteMessage(m, true)}
                          className="text-[9px] text-slate-500 hover:text-red-400"
                          title="Delete for everyone"
                        >
                          del
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 👇 yaha tak scroll karega */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 p-3 bg-slate-900/90">
          <form onSubmit={onSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-xs"
            >
              +
            </button>
            <input
              ref={msgInputRef}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={
                selectedFriend ? "Type a message..." : "Select a chat first"
              }
              disabled={!selectedFriend || sendingMsg}
            />
            <button
              type="submit"
              disabled={!selectedFriend || sendingMsg}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingMsg ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
