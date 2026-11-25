async function prepararAgenda() {
    const campo = document.getElementById("data-agenda");
    const calendario = document.querySelector(".painel-calendario");
    const lista = document.getElementById("lista-agenda");
    const dias = [...calendario.querySelectorAll("button.dia")];
    const hoje = hojeAgenda();
    campo.min = somarDias(hoje, -1826);
    campo.max = somarDias(hoje, 1826);
    let dataSelecionada = hoje;
    let mes;
    let atividades = [];
    let numeroConsulta = 0;

    function dataValida(data) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? "") || data < campo.min || data > campo.max) return false;
        const instante = new Date(data + "T12:00:00Z");
        return !Number.isNaN(instante.valueOf()) && instante.toISOString().slice(0, 10) === data;
    }

    function desenharCalendario() {
        const primeiro = new Date(mes + "-01T12:00:00Z");
        const quantidade = new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + 1, 0)).getUTCDate();
        const diasOcupados = new Set(atividades.map(item => item.data));
        const dataDeHoje = hojeAgenda();
        preencherTexto("h2", primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }), calendario);
        dias.forEach(function (botao, indice) {
            botao.hidden = indice >= quantidade;
            if (botao.hidden) return;
            const data = mes + "-" + String(indice + 1).padStart(2, "0");
            const ocupado = diasOcupados.has(data);
            botao.disabled = data < campo.min || data > campo.max;
            botao.dataset.data = data;
            botao.classList.toggle("com-atividades", ocupado);
            botao.classList.toggle("hoje", data === dataDeHoje);
            if (data === dataDeHoje) botao.setAttribute("aria-current", "date");
            else botao.removeAttribute("aria-current");
            botao.setAttribute("aria-pressed", String(data === dataSelecionada));
            botao.setAttribute("aria-label", formatarData(data, true) + (ocupado ? ", com atividades" : ""));
            botao.style.gridColumnStart = indice === 0 ? String(primeiro.getUTCDay() + 1) : "";
        });
    }

    async function escolher(data, recarregar = false) {
        if (!dataValida(data)) return;
        const numero = ++numeroConsulta;
        const mesEscolhido = data.slice(0, 7);
        if (recarregar || mesEscolhido !== mes) {
            const inicio = mesEscolhido + "-01";
            const primeiro = new Date(inicio + "T12:00:00Z");
            const fim = new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
            const registros = await consultarAgenda(inicio < campo.min ? campo.min : inicio, fim > campo.max ? campo.max : fim);
            if (numero !== numeroConsulta) return;
            atividades = registros;
            mes = mesEscolhido;
        }
        dataSelecionada = data;
        campo.value = data;
        const registros = atividades.filter(item => item.data === data);
        lista.replaceChildren(...registros.map(item => criarCartao(item, "modelo-cartao", atualizar)));
        preencherTexto("#titulo-data", formatarData(data, true));
        preencherTexto("#quantidade-atividades", registros.length + (registros.length === 1 ? " atividade" : " atividades"));
        document.getElementById("agenda-vazia").hidden = registros.length > 0;
        if (contextoAtual.usuario.tipo_perfil === "RESPONSAVEL") {
            const temVinculo = contextoAtual.vinculos.some(vinculo => vinculo.situacao === "ACEITO");
            preencherTexto("#agenda-vazia .texto-secundario", temVinculo ? "Não há atividades programadas para esta data."
                : "Abra Pessoas para enviar um pedido de vínculo.");
        }
        desenharCalendario();
        const endereco = new URL(location.href);
        endereco.searchParams.set("data", data);
        history.replaceState(null, "", endereco);
    }

    async function atualizar() { await escolher(dataSelecionada, true); }
    function acao(botao, funcao) {
        botao.addEventListener("click", function () { executarAcao(botao, funcao); });
    }
    const abrir = document.querySelector('[data-acao="abrir-calendario"]');
    acao(abrir, async function () {
        calendario.hidden = !calendario.hidden;
        abrir.setAttribute("aria-expanded", String(!calendario.hidden));
        preencherTexto(".texto-botao", calendario.hidden ? "Abrir calendário" : "Fechar calendário", abrir);
    });
    dias.forEach(botao => acao(botao, () => escolher(botao.dataset.data)));
    document.querySelectorAll('[data-acao="mudar-dia"]').forEach(function (botao) {
        acao(botao, () => escolher(somarDias(dataSelecionada, Number(botao.dataset.passo))));
    });
    document.querySelectorAll('[data-acao="mudar-mes"]').forEach(function (botao) {
        acao(botao, async function () {
            const data = new Date(mes + "-01T12:00:00Z");
            data.setUTCMonth(data.getUTCMonth() + Number(botao.dataset.passo));
            const proximo = data.toISOString().slice(0, 7);
            if (proximo >= campo.min.slice(0, 7) && proximo <= campo.max.slice(0, 7)) {
                await escolher(proximo === campo.min.slice(0, 7) ? campo.min : proximo + "-01");
            }
        });
    });
    document.querySelectorAll('[data-acao="atualizar"]').forEach(botao => acao(botao, atualizar));
    acao(document.querySelector('[data-acao="voltar-hoje"]'), () => escolher(hojeAgenda()));
    campo.addEventListener("change", function () {
        if (!dataValida(campo.value)) {
            campo.value = dataSelecionada;
            return;
        }
        escolher(campo.value).catch(function (erro) {
            campo.value = dataSelecionada;
            mostrarAviso(mensagemErro(erro));
        });
    });
    const solicitada = new URLSearchParams(location.search).get("data");
    await escolher(dataValida(solicitada) ? solicitada : hoje);
}
