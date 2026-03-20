const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const token = process.env.TINY_TOKEN;
  if (!token) return res.status(500).json({ error: "TINY_TOKEN não configurado" });

  const {
    nome_cliente, numero_doc,
    data_ini_emissao, data_fim_emissao,
    data_ini_vencimento, data_fim_vencimento,
    situacao, pagina,
  } = req.body || {};

  const params = new URLSearchParams();
  params.append("token", token);
  params.append("formato", "JSON");
  if (nome_cliente)        params.append("nome_cliente", nome_cliente);
  if (numero_doc)          params.append("numero_doc", numero_doc);
  if (data_ini_emissao)    params.append("data_ini_emissao", data_ini_emissao);
  if (data_fim_emissao)    params.append("data_fim_emissao", data_fim_emissao);
  if (data_ini_vencimento) params.append("data_ini_vencimento", data_ini_vencimento);
  if (data_fim_vencimento) params.append("data_fim_vencimento", data_fim_vencimento);
  if (situacao)            params.append("situacao", situacao);
  params.append("pagina", pagina || 1);

  try {
    const response = await axios.post(
      "https://api.tiny.com.br/api2/contas.pagar.pesquisa.php",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    const retorno = response.data?.retorno;
    if (!retorno) throw new Error("Resposta inválida da API");

    if (retorno.status === "Erro") {
      const cod = retorno.codigo_erro;
      // codigo 20 = sem registros, não é erro fatal
      if (cod == 20) {
        return res.status(200).json({ ok: true, pagina: 1, numero_paginas: 1, contas: [] });
      }
      return res.status(200).json({
        ok: false,
        error: retorno.erros?.[0]?.erro || "Erro desconhecido",
        codigo_erro: cod,
      });
    }

    const contas = (retorno.contas || []).map((c) => c.conta || c);

    return res.status(200).json({
      ok: true,
      pagina: retorno.pagina,
      numero_paginas: retorno.numero_paginas,
      contas,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
