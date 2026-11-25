iniciarPagina(async function () {
    const pessoa = await conferirResposta(obterCliente().from("usuarios").select("*").eq("id_usuario", idIdosoAtual).single());
    const formulario = document.querySelector("form[data-formulario]");
    formulario.elements.data_nascimento.max = hojeAgenda();
    preencherCampos(formulario, { ...pessoa, nome_contato_emergencia: pessoa.contato_emergencia,
        telefone_contato_emergencia: pessoa.telefone_emergencia });
    prepararFormulario(formulario, async function () {
        await salvarDadosPessoais(formulario, pessoa);
        abrirPagina("responsavel/dados-do-idoso/dados-do-idoso.html", { idoso: idIdosoAtual });
    });
});
