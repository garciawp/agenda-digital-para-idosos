iniciarPagina(async function () {
    const formulario = document.querySelector("form[data-formulario]");
    const campos = formulario.elements;
    const emergencia = document.getElementById("dados-emergencia");
    campos.data_nascimento.max = hojeAgenda();
    function atualizarPerfil() {
        emergencia.disabled = campos.tipo_perfil.value !== "IDOSO";
        emergencia.hidden = emergencia.disabled;
    }
    [...campos.tipo_perfil].forEach(function (opcao) { opcao.addEventListener("change", atualizarPerfil); });
    atualizarPerfil();
    prepararFormulario(formulario, async function () {
        if (campos.senha.value !== campos.repetir_senha.value) throw new Error("As senhas devem ser iguais.");
        const nome = campos.nome_completo.value.trim();
        if (nome.length < 2) throw new Error("Informe seu nome completo.");
        const dados = {
            nome_completo: nome,
            tipo_perfil: campos.tipo_perfil.value,
            nome_exibicao: campos.nome_exibicao.value.trim() || null,
            data_nascimento: campos.data_nascimento.value || null,
            telefone: campos.telefone.value.trim() || null
        };
        if (!emergencia.disabled) {
            dados.contato_emergencia = campos.contato_emergencia.value.trim() || null;
            dados.telefone_emergencia = campos.telefone_emergencia.value.trim() || null;
        }
        const { error } = await obterCliente().auth.signUp({
            email: campos.email.value.trim(),
            password: campos.senha.value,
            options: { data: dados, emailRedirectTo: enderecoPagina("paginas/entrar/entrar.html") }
        });
        if (error) throw error;
        campos.senha.value = "";
        campos.repetir_senha.value = "";
        const resultado = document.getElementById("resultado-formulario");
        resultado.hidden = false;
        resultado.textContent = "Solicitação recebida. Confira seu e-mail e a pasta de spam para confirmar o cadastro. Se já possui uma conta, entre ou solicite a recuperação de senha.";
        resultado.tabIndex = -1;
        resultado.focus();
    });
});
