const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const token = process.env.TINY_TOKEN;
  if (!token) return res.status(500).json({ error: "TINY_TOKEN não configurado" });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "id obrigatório" });

  const params = new URLSearchParams();
  params.append("token", token);
  params.append("formato", "JSON");
  params.append("id", id);

  try {
    const response = await axios.post(
      "https://api.tiny.com.br/api2/conta.pagar.obter.php",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    const retorno = response.data?.retorno;
    if (!retorno) throw new Error("Resposta inválida da API");

    if (retorno.status === "Erro") {
      return res.status(200).json({
        ok: false,
        error: retorno.erros?.[0]?.erro || "Erro desconhecido",
      });
    }

    return res.status(200).json({ ok: true, conta: retorno.conta });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
