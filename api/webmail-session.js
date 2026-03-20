const axios = require("axios");
const https = require("https");

// Ignora erros de certificado SSL autoassinado (comum em servidores cPanel compartilhados)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN } = process.env;

  if (!CPANEL_HOST || !CPANEL_USER || !CPANEL_TOKEN) {
    return res.status(500).json({
      error: "Variáveis de ambiente não configuradas: CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN",
    });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "Parâmetro 'email' é obrigatório" });
  }

  try {
    const [login, domain] = email.split('@');
    if (!login || !domain) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // UAPI: Session/create_webmail_session_for_mail_user
    // Cria uma sessão temporária de webmail sem precisar da senha do usuário
    const url = `https://${CPANEL_HOST}:2083/execute/Session/create_webmail_session_for_mail_user`;

    const response = await axios.get(url, {
      httpsAgent,
      headers: {
        Authorization: `cpanel ${CPANEL_USER}:${CPANEL_TOKEN}`,
      },
      params: { login, domain },
      timeout: 15000,
    });

    const data = response.data;

    if (!data || data.status === 0) {
      return res.status(500).json({
        error: "Erro ao criar sessão de webmail",
        details: data?.errors || null,
      });
    }

    const sessionData = data.data || {};

    // token já vem como "/cpsessXXXXXXXX", então basta prefixar o host
    const webmailUrl = sessionData.url ||
      (sessionData.token
        ? `https://${CPANEL_HOST}:2096${sessionData.token}/`
        : null);

    if (!webmailUrl) {
      return res.status(500).json({
        error: "API não retornou URL de sessão",
        details: sessionData,
      });
    }

    return res.status(200).json({ webmailUrl });
  } catch (err) {
    return res.status(500).json({
      error: "Falha ao criar sessão de webmail",
      details: err.message,
    });
  }
};
