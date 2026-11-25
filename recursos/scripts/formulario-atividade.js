async function prepararAtividade(editando) {
    const formulario = document.querySelector('form[data-formulario]');
    const { tipo, frequencia, id_categoria: categorias, data_inicio, data_fim, dose } = formulario.elements;
    const lista = document.getElementById('lista-horarios');
    const linhas = [...lista.querySelectorAll('.linha-horario')].map(function (linha) {
        return { linha, campo: linha.querySelector('input'), remover: linha.querySelector('button') };
    });
    const adicionar = document.getElementById('adicionar-horario');
    const identificador = editando ? Number(new URLSearchParams(location.search).get('atividade')) : null;
    let quantidade = 1;

    function exibirGrupo(id, visivel) {
        const grupo = document.getElementById(id);
        grupo.hidden = !visivel;
        grupo.querySelectorAll('input, textarea').forEach(campo => campo.disabled = !visivel);
    }

    function atualizarTipo(categoriaAnterior = categorias.value) {
        const medicamento = tipo.value === 'MEDICAMENTO';
        exibirGrupo('campos-medicamento', medicamento);
        dose.required = medicamento;
        const opcoes = contextoAtual.categorias.filter(categoria => (categoria.nome === 'Medicamento') === medicamento);
        categorias.replaceChildren(new Option('Escolha uma categoria', ''));
        opcoes.forEach(categoria => categorias.add(new Option(categoria.nome, categoria.id_categoria)));
        if (opcoes.some(categoria => String(categoria.id_categoria) === String(categoriaAnterior))) {
            categorias.value = categoriaAnterior;
        } else if (medicamento && opcoes.length === 1) {
            categorias.value = opcoes[0].id_categoria;
        }
    }

    function atualizarHorarios() {
        const unica = frequencia.value === 'UNICA';
        linhas.forEach(function ({ linha, campo, remover }, indice) {
            linha.hidden = indice >= quantidade;
            campo.disabled = linha.hidden;
            remover.hidden = quantidade === 1;
            campo.setAttribute('aria-label', 'Horário ' + (indice + 1));
            remover.setAttribute('aria-label', 'Remover horário ' + (indice + 1));
        });
        adicionar.hidden = unica || quantidade === linhas.length;
    }

    function atualizarRepeticao() {
        const unica = frequencia.value === 'UNICA';
        exibirGrupo('campo-termino', !unica);
        exibirGrupo('campo-semana', frequencia.value === 'SEMANAL');
        if (unica) quantidade = 1;
        atualizarHorarios();
    }

    if (editando) {
        const original = (await consultarAtividades()).find(item => item.id_atividade === identificador);
        if (!original) throw new Error('Atividade não encontrada. Volte para Organizar atividades.');
        preencherCampos(formulario, original);
        tipo.disabled = true;
        atualizarTipo(original.id_categoria);
        const horarios = [...new Set(original.horarios.map(item => item.horario.slice(0, 5)))];
        quantidade = Math.max(1, horarios.length);
        horarios.forEach((horario, indice) => linhas[indice].campo.value = horario);
        formulario.querySelectorAll('[name="dias_semana"]').forEach(campo => {
            campo.checked = original.horarios.some(horario => horario.dia_semana === Number(campo.value));
        });
    } else {
        data_inicio.value = hojeAgenda();
        atualizarTipo();
    }

    tipo.addEventListener('change', () => atualizarTipo());
    frequencia.addEventListener('change', atualizarRepeticao);
    data_inicio.addEventListener('change', () => data_fim.min = data_inicio.value);
    data_fim.min = data_inicio.value;
    adicionar.addEventListener('click', function () {
        const campo = linhas[quantidade].campo;
        campo.value = '';
        quantidade += 1;
        atualizarHorarios();
        campo.focus();
    });
    linhas.forEach(function ({ remover }, indice) {
        remover.addEventListener('click', function () {
            for (let posicao = indice; posicao < quantidade - 1; posicao++) {
                linhas[posicao].campo.value = linhas[posicao + 1].campo.value;
            }
            quantidade -= 1;
            linhas[quantidade].campo.value = '';
            atualizarHorarios();
            linhas[Math.min(indice, quantidade - 1)].campo.focus();
        });
    });
    atualizarRepeticao();

    prepararFormulario(formulario, async function () {
        const dados = Object.fromEntries(new FormData(formulario));
        dados.tipo = tipo.value;
        dados.titulo = dados.titulo.trim();
        if (dados.titulo.length < 2) throw new Error('Informe um título com pelo menos dois caracteres.');
        if (dados.data_fim && dados.data_fim < dados.data_inicio) throw new Error('O término deve ser igual ou posterior ao início.');
        const dias = frequencia.value === 'SEMANAL'
            ? [...formulario.querySelectorAll('[name="dias_semana"]:checked')].map(campo => Number(campo.value))
            : [null];
        if (!dias.length) throw new Error('Escolha pelo menos um dia da semana.');
        const horarios = linhas.slice(0, quantidade).map(({ campo }) => campo.value);
        if (new Set(horarios).size !== horarios.length) throw new Error('Os horários devem ser diferentes.');
        dados.horarios = dias.flatMap(dia => horarios.map(horario => ({ horario, dia_semana: dia })));
        dados.id_categoria = Number(categorias.value);
        dados.data_fim = frequencia.value === 'UNICA' ? dados.data_inicio : dados.data_fim || null;
        dados.dose = tipo.value === 'MEDICAMENTO' ? dose.value.trim() : null;
        if (tipo.value === 'MEDICAMENTO' && !dados.dose) throw new Error('Informe a dose do medicamento.');
        dados.instrucoes_medicamento = tipo.value === 'MEDICAMENTO' ? dados.instrucoes_medicamento || null : null;
        await executarOperacao('salvar_atividade', { p_idoso: idIdosoAtual, p_dados: dados, p_atividade: identificador });
        abrirPagina('responsavel/atividades/atividades.html', { idoso: idIdosoAtual });
    });
}
