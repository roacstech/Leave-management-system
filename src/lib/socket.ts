/**
 * Helper to emit realtime notifications to the Socket.IO server room `user:${userId}`.
 */
export async function emitRealtimeNotification(userId: number, event: string, data: any) {
  const socketPort = process.env.SOCKET_PORT || "3002";
  const socketHost = process.env.SOCKET_HOST || "localhost";
  const emitUrl = `http://${socketHost}:${socketPort}/emit`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(emitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, event, data }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`[Socket Emit] Failed to emit to ${emitUrl}: HTTP ${res.status}`);
    }
  } catch (err) {
    // Non-blocking: Socket server may be starting or offline; database persistence is source of truth.
    // The client will still receive notifications via initial fetch/polling.
  }
}
