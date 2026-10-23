import net from "node:net";

/**
 * Faux serveur SMTP minimal sur le port de test (playwright.config : SMTP_PORT=1025)
 * pour compter les emails envoyés par l'app. Accepte tout, sans TLS ni auth.
 * shortcut: parse juste RCPT TO et le header Subject brut ; passer à Mailpit si un test doit lire le corps.
 */
export type CapturedMail = { to: string[]; raw: string };

export async function startSmtpSink(port = 1025) {
  const mails: CapturedMail[] = [];
  const server = net.createServer((socket) => {
    let to: string[] = [];
    let data: string | null = null;
    let buffer = "";
    socket.write("220 sink ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (data !== null) {
        const end = buffer.indexOf("\r\n.\r\n");
        if (end === -1) return;
        mails.push({ to, raw: buffer.slice(0, end) });
        buffer = buffer.slice(end + 5);
        data = null;
        to = [];
        socket.write("250 OK\r\n");
      }
      let nl;
      while (data === null && (nl = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "RCPT") to.push(/<([^>]*)>/.exec(line)?.[1] ?? "");
        if (cmd === "DATA") {
          data = "";
          socket.write("354 go\r\n");
        } else if (cmd === "QUIT") {
          socket.end("221 bye\r\n");
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
    socket.on("error", () => {});
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  });
  return {
    mails,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
