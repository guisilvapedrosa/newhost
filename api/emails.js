const axios = require("axios");
const https = require("https");

// Ignora erros de certificado SSL autoassinado (comum em servidores cPanel compartilhados)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN } = process.env;

  if (!CPANEL_HOST || !CPANEL_USER || !CPANEL_TOKEN) {
    return res.status(500).json({
      error: "Variáveis de ambiente não configuradas: CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN",
    });
  }

  try {
    const url = `https://${CPANEL_HOST}:2083/execute/Email/list_pops`;

    const response = await axios.get(url, {
      httpsAgent,
      headers: {
        Authorization: `cpanel ${CPANEL_USER}:${CPANEL_TOKEN}`,
      },
      timeout: 15000,
    });

    const data = response.data;

    if (!data || data.status === 0) {
      return res.status(500).json({
        error: "Erro retornado pela API cPanel",
        details: data?.errors || null,
      });
    }

    // Normaliza a lista de emails retornada
    const emails = (data.data || []).map((item) => ({
      email: item.email,
      user: item.user,
      domain: item.domain,
      diskused: item.diskused,
      diskquota: item.diskquota,
    }));

    return res.status(200).json({ emails });
  } catch (err) {
    return res.status(500).json({
      error: "Falha ao conectar na API cPanel",
      details: err.message,
    });
  }
};
