iniciarPagina(async function () {
    const pessoa = contextoAtual.usuario;
    const formulario = document.querySelector("form[data-formulario]");
    formulario.elements.data_nascimento.max = hojeAgenda();
    preencherCampos(formulario, pessoa);
    prepararFormulario(formulario, async function () {
        await salvarDadosPessoais(formulario, pessoa);
        abrirPagina("responsavel/perfil/perfil.html");
    });
});
