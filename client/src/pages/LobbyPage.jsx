import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Mic,
  Headphones,
  Send,
  User,
  LogOut,
  Copy,
  XCircle,
  Users,
} from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import { useToast } from "../hooks/useToast";
import { apiPatch } from "../api/client";
import { sendAction, createLobbySocket } from "../features/lobby/socket";
import { useWebRTC } from "../hooks/useWebRTC";
import ConfirmationModal from "../components/ConfirmationModal";
import UserProfileLink from "../components/UserProfileLink";

const mergeMessages = (a, b) =>
  [...new Map([...a, ...b].map((item) => [item.id, item])).values()]
    .sort((x, y) => x.timestamp.localeCompare(y.timestamp))
    .slice(-100);
export default function LobbyPage() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { toast } = useToast();
  const [lobby, setLobby] = useState(null),
    [messages, setMessages] = useState([]),
    [connection, setConnection] = useState("connecting"),
    [error, setError] = useState("");
  const [message, setMessage] = useState(""),
    [credentials, setCredentials] = useState(""),
    [showSquad, setShowSquad] = useState(false),
    [confirm, setConfirm] = useState(false),
    [audioBlocked, setAudioBlocked] = useState(false);
  const bottom = useRef(null),
    dirty = useRef(false);
  const [socket] = useState(createLobbySocket);
  const voice = useWebRTC(lobbyId, user.id, socket);
  const { cleanup: cleanupVoice } = voice;
  useEffect(() => {
    let active = true;
    const update = (state) => {
      if (!active) return;
      setLobby(state);
      if (!dirty.current) setCredentials(state.credentials || "");
    };
    const connected = async () => {
      try {
        const result = await sendAction(socket, "join_lobby", { lobbyId });
        if (!active) return;
        update(result.lobby);
        setMessages((old) => mergeMessages(result.messages, old));
        setConnection("connected");
        setError("");
      } catch (err) {
        if (active) {
          setConnection("error");
          setError(err.message);
        }
      }
    };
    const disconnected = () => {
      if (active) setConnection("reconnecting");
    };
    const failed = (err) => {
      if (active) {
        setConnection("error");
        setError(
          socket.ticketError ||
            err.message ||
            "Could not connect. Please retry.",
        );
      }
    };
    const incoming = (entry) => {
      if (active) setMessages((old) => mergeMessages(old, [entry]));
    };
    const removed = () => {
      cleanupVoice();
      toast({ title: "You left the lobby" });
      navigate("/browse", { replace: true });
    };
    const kicked = () => {
      cleanupVoice();
      toast({
        title: "Removed from lobby",
        description: "The host removed you from this lobby.",
        variant: "destructive",
      });
      navigate("/browse", { replace: true });
    };
    const closed = () => {
      cleanupVoice();
      toast({ title: "Lobby closed" });
      navigate("/browse", { replace: true });
    };
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", failed);
    socket.on("lobby_updated", update);
    socket.on("new_message", incoming);
    socket.on("lobby_left", removed);
    socket.on("player_kicked", kicked);
    socket.on("LOBBY_DISBANDED", closed);
    socket.connect();
    return () => {
      active = false;
      socket.off("connect", connected);
      socket.off("disconnect", disconnected);
      socket.off("connect_error", failed);
      socket.off("lobby_updated", update);
      socket.off("new_message", incoming);
      socket.off("lobby_left", removed);
      socket.off("player_kicked", kicked);
      socket.off("LOBBY_DISBANDED", closed);
      socket.disconnect();
    };
  }, [socket, lobbyId, navigate, toast, cleanupVoice]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);
  async function action(event, payload = {}) {
    try {
      return await sendAction(socket, event, payload);
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
      return null;
    }
  }
  async function send(event) {
    event.preventDefault();
    if (!message.trim()) return;
    const result = await action("send_message", { message: message.trim() });
    if (result) setMessage("");
  }
  async function saveCredentials() {
    const result = await action("update_credentials", { credentials });
    if (result) {
      dirty.current = false;
      toast({ title: "Game details saved" });
    }
  }
  async function closeLobby() {
    try {
      await apiPatch(`/api/lobbies/${lobbyId}/close`);
      navigate("/browse", { replace: true });
    } catch (err) {
      toast({
        title: "Could not close lobby",
        description: err.message,
        variant: "destructive",
      });
    }
  }
  async function invite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Invite link copied" });
    } catch {
      toast({ title: "Copy this page’s address to invite a teammate." });
    }
  }
  async function leave() {
    if (await action("leave_lobby")) navigate("/browse", { replace: true });
  }
  const connected = connection === "connected";
  const host = lobby?.hostId === user.id;
  const players = lobby?.participants || [];
  const ready = players.filter((p) => p.isReady).length;
  const me = players.find((p) => p.userId === user.id);
  if (!lobby)
    return (
      <main className="h-[100dvh] bg-[#232428] text-gray-200 grid place-items-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold">
            {connection === "error"
              ? "Could not join the lobby"
              : "Connecting to your squad…"}
          </h1>
          <p className="text-sm text-gray-400 max-w-md">
            {error || "The server may need a moment to wake up."}
          </p>
          <button
            className="text-emerald-400 px-4 py-2"
            onClick={() =>
              socket.connected
                ? sendAction(socket, "join_lobby", { lobbyId })
                    .then((result) => {
                      setLobby(result.lobby);
                      setConnection("connected");
                      setError("");
                    })
                    .catch((err) => setError(err.message))
                : socket.connect()
            }
          >
            Retry connection
          </button>
          <button
            className="text-gray-400 px-4 py-2"
            onClick={() => navigate("/browse")}
          >
            Back to games
          </button>
        </div>
      </main>
    );
  return (
    <main className="h-[100dvh] flex flex-col bg-[#313338] text-gray-100 overflow-hidden">
      <ConfirmationModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={closeLobby}
        title="Close lobby?"
        description="This ends the lobby for everyone. You can create another whenever you’re ready."
        confirmText="Close Lobby"
        cancelText="Cancel"
      />
      <header className="min-h-14 px-4 py-2 border-b border-[#1b1c1e] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold truncate">{lobby.title}</h1>
          <p className="text-xs text-emerald-400 truncate">
            {lobby.game?.name} · {lobby.region || "Region unspecified"}
            {lobby.language ? ` · ${lobby.language}` : ""}
          </p>
        </div>
        <button
          onClick={() => setShowSquad(!showSquad)}
          className="md:hidden px-3 py-2 rounded bg-[#232428] text-sm flex items-center gap-2"
        >
          <Users size={16} />
          {players.length}/{lobby.maxPlayers}
        </button>
        <span
          className={`hidden md:block text-xs ${connected ? "text-emerald-400" : "text-amber-300"}`}
        >
          {connected
            ? "Connected"
            : connection === "error"
              ? "Connection failed"
              : "Reconnecting…"}
        </span>
      </header>
      {!connected && (
        <div
          role="status"
          className="px-4 py-2 bg-amber-950 text-amber-200 text-sm flex justify-between gap-3"
        >
          <span>
            {error ||
              "Connection interrupted. Your place is reserved while you reconnect."}
          </span>
          <button
            className="underline shrink-0"
            onClick={() => socket.connect()}
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <section
          className={`${showSquad ? "hidden md:flex" : "flex"} flex-col flex-1 min-w-0`}
          aria-label="Lobby chat"
        >
          <div className="m-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm">
            Find your rhythm. Be kind to your teammates.
          </div>
          <div
            className="flex-1 overflow-y-auto px-4 pb-4 space-y-4"
            aria-live="polite"
          >
            <p className="text-gray-400 text-sm">
              Welcome to the lobby. Invite a teammate and ready up.
            </p>
            {messages.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-600 shrink-0 grid place-items-center">
                  {entry.user?.avatar ? (
                    <img
                      src={entry.user.avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">
                      {entry.user?.username}
                    </span>
                    <time className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="text-sm text-gray-300 break-words whitespace-pre-wrap">
                    {entry.text}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <form onSubmit={send} className="p-4">
            <div className="flex bg-[#383a40] rounded-lg">
              <input
                aria-label="Lobby message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                disabled={!connected}
                placeholder="Message your squad…"
                className="w-full bg-transparent p-3 text-sm focus:outline-none disabled:opacity-50"
              />
              <button
                aria-label="Send message"
                disabled={!connected || !message.trim()}
                className="px-4 text-gray-300 disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </section>
        <aside
          aria-label="Squad members"
          className={`${showSquad ? "flex" : "hidden md:flex"} flex-col w-full md:w-[300px] shrink-0 bg-[#2b2d31] border-l border-[#1f2023]`}
        >
          <div className="p-4 border-b border-gray-800">
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
              <span>
                Squad {players.length}/{lobby.maxPlayers}
              </span>
              <span className="text-emerald-400">{ready} ready</span>
            </div>
            <div
              className="flex gap-1 mt-3"
              aria-label={`${players.length} of ${lobby.maxPlayers} party slots filled`}
            >
              {Array.from(
                { length: Math.min(lobby.maxPlayers, 20) },
                (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < players.length ? "bg-emerald-500" : "bg-gray-700"}`}
                  />
                ),
              )}
            </div>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto flex-1">
            {players.map((p) => (
              <div
                key={p.userId}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
              >
                <div className="w-9 h-9 rounded-full bg-gray-600 grid place-items-center shrink-0">
                  <User size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <UserProfileLink
                    username={p.user?.username}
                    alias={p.userId === user.id ? "You" : undefined}
                    className="font-semibold text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    {p.userId === lobby.hostId
                      ? "★ Host"
                      : p.online
                        ? "Connected"
                        : "Reconnecting"}
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${p.isReady ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-gray-500 border-gray-700"}`}
                >
                  {p.isReady ? "Ready" : "Waiting"}
                </span>
                {host && p.userId !== user.id && (
                  <button
                    aria-label={`Kick ${p.user.username}`}
                    onClick={() =>
                      action("kick_player", { targetUserId: p.userId })
                    }
                    className="text-red-400 p-1"
                  >
                    <LogOut size={14} />
                  </button>
                )}
              </div>
            ))}
            {Array.from(
              { length: Math.max(0, lobby.maxPlayers - players.length) },
              (_, i) => (
                <button
                  key={i}
                  onClick={invite}
                  className="block w-full border border-dashed border-gray-600 rounded-lg p-4 text-gray-400 text-sm hover:text-emerald-300 hover:border-emerald-500"
                >
                  + Invite a teammate
                </button>
              ),
            )}
          </div>
        </aside>
      </div>
      <div className="px-4 py-2 bg-[#292b30] flex items-center gap-2 text-xs">
        <span className="text-gray-400 shrink-0">Game details</span>
        <input
          aria-label="Game credentials"
          readOnly={!host}
          value={credentials}
          maxLength={2000}
          onChange={(e) => {
            dirty.current = true;
            setCredentials(e.target.value);
          }}
          placeholder={
            host
              ? "Room ID, invite code, or game password"
              : "Waiting for host…"
          }
          className="flex-1 min-w-0 bg-[#1e1f22] rounded px-3 py-2 focus:outline-none"
        />
        {host ? (
          <button
            disabled={!connected}
            onClick={saveCredentials}
            className="text-emerald-400 px-2 py-2"
          >
            Save
          </button>
        ) : (
          <button
            aria-label="Copy game details"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(credentials);
                toast({ title: "Game details copied" });
              } catch {
                toast({ title: "Copy the displayed game details manually." });
              }
            }}
          >
            <Copy size={16} />
          </button>
        )}
      </div>
      {voice.error && (
        <p
          role="status"
          className="px-4 py-2 text-xs text-amber-200 bg-amber-950"
        >
          {voice.error}
        </p>
      )}
      <footer className="bg-[#232428] flex flex-wrap justify-between items-center gap-3 p-3 md:px-5">
        <div className="flex items-center gap-2">
          {voice.active ? (
            <>
              <button
                onClick={() => voice.leaveVoice().catch(() => {})}
                className="text-xs px-3 py-2 rounded bg-emerald-500/10 text-emerald-300"
              >
                Leave voice
              </button>
              <button
                aria-label={
                  voice.isMuted ? "Unmute microphone" : "Mute microphone"
                }
                aria-pressed={voice.isMuted}
                onClick={voice.toggleMute}
                className={`p-2 rounded ${voice.isMuted ? "text-red-400" : "text-emerald-400"}`}
              >
                <Mic size={18} />
              </button>
              <button
                aria-label={
                  voice.isDeafened ? "Enable speaker audio" : "Deafen audio"
                }
                aria-pressed={voice.isDeafened}
                onClick={voice.toggleDeafen}
                className={`p-2 ${voice.isDeafened ? "text-red-400" : "text-gray-300"}`}
              >
                <Headphones size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={voice.joinVoice}
              disabled={!connected || voice.busy}
              className="text-sm px-3 py-2 bg-[#35373c] rounded-lg flex gap-2 items-center disabled:opacity-50"
            >
              <Mic size={16} />
              {voice.busy ? "Connecting voice…" : "Join voice"}
            </button>
          )}
          {audioBlocked && (
            <button
              className="text-xs text-amber-300 underline"
              onClick={() =>
                Promise.all(
                  [...document.querySelectorAll("audio")].map((el) =>
                    el.play(),
                  ),
                )
                  .then(() => setAudioBlocked(false))
                  .catch(() => {})
              }
            >
              Enable audio
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            disabled={!connected}
            onClick={() => action("toggle_ready")}
            className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${me?.isReady ? "bg-gray-600" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {me?.isReady ? "Cancel ready" : "Ready up"}
          </button>
          {host ? (
            <button
              disabled={!connected}
              onClick={() => setConfirm(true)}
              className="px-3 py-2 border border-red-500/50 rounded-lg text-red-300"
              aria-label="Close lobby"
            >
              <XCircle size={18} />
            </button>
          ) : (
            <button
              disabled={!connected}
              onClick={leave}
              className="px-3 py-2 border border-red-500/50 rounded-lg text-red-300"
              aria-label="Leave lobby"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </footer>
      {voice.streams.map((item) => (
        <audio
          data-peer={item.peerId}
          key={item.peerId}
          autoPlay
          muted={voice.isDeafened}
          ref={(element) => {
            if (element && element.srcObject !== item.stream) {
              element.srcObject = item.stream;
              element.play().catch(() => setAudioBlocked(true));
            }
          }}
        />
      ))}
    </main>
  );
}
