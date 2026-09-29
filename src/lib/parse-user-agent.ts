// Converte um user-agent cru em uma descrição curta tipo "Chrome em Windows"
export function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconhecido";
  const s = ua.toLowerCase();

  let os = "Outro";
  if (/windows/.test(s)) os = "Windows";
  else if (/cros|chromebook|chrome\s*os/.test(s)) os = "Chromebook";
  else if (/android/.test(s)) os = "Android";
  else if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/linux/.test(s)) os = "Linux";

  let browser = "Navegador";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/firefox/.test(s)) browser = "Firefox";
  else if (/chrome/.test(s) && !/edg|opr/.test(s)) browser = "Chrome";
  else if (/safari/.test(s) && !/chrome|crios|fxios|edg/.test(s)) browser = "Safari";
  else if (/crios/.test(s)) browser = "Chrome";
  else if (/fxios/.test(s)) browser = "Firefox";

  return `${browser} em ${os}`;
}
