document.addEventListener("DOMContentLoaded", function () {
    iniciarPagina(async function () {
        if (vinculoAtual) preencherTexto("main h1", "Agenda de " + nomePessoa(vinculoAtual));
        await prepararAgenda();
    });
});
