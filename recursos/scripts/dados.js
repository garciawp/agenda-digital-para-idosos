async function conferirResposta(consulta) {
    const { data, error } = await consulta;
    if (error) throw error;
    return data;
}

async function consultarAtividades() {
    return conferirResposta(obterCliente().from('atividades').select('*, categorias(nome,icone), horarios(*)').eq('id_idoso', idIdosoAtual).eq('arquivada', false).order('data_inicio'));
}

async function consultarAgenda(inicio, fim) {
    const responsavel = contextoAtual.usuario.tipo_perfil === "RESPONSAVEL";
    if (responsavel) contextoAtual.vinculos = await executarOperacao("consultar_vinculos");
    const vinculos = contextoAtual.vinculos.filter(vinculo => vinculo.situacao === "ACEITO");
    if (responsavel && idIdosoAtual && !vinculos.some(vinculo => vinculo.id_idoso === idIdosoAtual)) {
        document.querySelector("main").hidden = true;
        location.replace(enderecoPagina("responsavel/pessoas/pessoas.html"));
        return [];
    }
    const ids = idIdosoAtual ? [idIdosoAtual] : vinculos.map(function (vinculo) { return vinculo.id_idoso; });
    if (!ids.length) return [];
    await Promise.all(ids.map(function (id) {
        return executarOperacao("gerar_ocorrencias", { p_idoso: id, p_inicio: inicio, p_fim: fim });
    }));
    const nomes = new Map(vinculos.map(function (vinculo) { return [vinculo.id_idoso, nomePessoa(vinculo)]; }));
    const ocorrencias = [];
    let pagina;
    do {
        pagina = await conferirResposta(obterCliente().from("ocorrencias")
            .select("*,categorias(nome,icone),atividades!inner(id_idoso,tipo,arquivada)")
            .in("atividades.id_idoso", ids).neq("situacao", "CANCELADA")
            .gte("data", inicio).lte("data", fim).order("data").order("horario").order("id_ocorrencia")
            .range(ocorrencias.length, ocorrencias.length + 999));
        ocorrencias.push(...pagina);
    } while (pagina.length === 1000);
    const hoje = hojeAgenda();
    const agora = new Date();
    return ocorrencias.map(function (item) {
        const { id_idoso, tipo, arquivada } = item.atividades;
        const instante = item.data + "T" + item.horario + "-03:00";
        const estado = item.situacao === "CONCLUIDA" ? "CONCLUIDO"
            : item.data < hoje || arquivada ? "SEM_CONFIRMACAO"
            : new Date(instante) > agora ? "PROGRAMADO" : "AGUARDANDO";
        return { ...item, tipo, arquivada, pessoa: idIdosoAtual ? null : nomes.get(id_idoso),
            categoria: item.categorias.nome, icone: item.categorias.icone,
            horario: item.horario.slice(0, 5), data_hora_prevista: instante, estado };
    });
}

async function confirmarOcorrencia(atividade, concluida) {
    await executarOperacao('confirmar_ocorrencia', { p_ocorrencia: atividade.id_ocorrencia, p_concluida: concluida });
}

async function encerrarVinculo(vinculo) {
    await executarOperacao('encerrar_vinculo', { p_vinculo: vinculo.id_vinculo });
}

async function salvarDadosPessoais(formulario, pessoa) {
    const dados = Object.fromEntries(new FormData(formulario));
    await executarOperacao('alterar_dados_pessoais', { p_usuario: pessoa.id_usuario, p_nome: dados.nome_completo,
        p_exibicao: dados.nome_exibicao || null, p_nascimento: dados.data_nascimento || null,
        p_telefone: dados.telefone || null, p_contato: (dados.nome_contato_emergencia ?? pessoa.contato_emergencia) || null,
        p_emergencia: (dados.telefone_contato_emergencia ?? pessoa.telefone_emergencia) || null,
        p_observacoes: (dados.observacoes ?? pessoa.observacoes) || null });
}
