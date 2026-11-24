async function conferirResposta(consulta) {
    const { data, error } = await consulta;
    if (error) throw error;
    return data;
}

async function consultarAtividades() {
    return conferirResposta(obterCliente().from('atividades').select('*, categorias(nome,icone), horarios(*)').eq('id_idoso', idIdosoAtual).eq('arquivada', false).order('data_inicio'));
}

async function consultarAgenda(inicio, fim) {
    await executarOperacao('gerar_ocorrencias', { p_idoso: idIdosoAtual, p_inicio: inicio, p_fim: fim });
    const atividades = await conferirResposta(obterCliente().from('atividades').select('id_atividade,tipo').eq('id_idoso', idIdosoAtual).eq('arquivada', false));
    if (!atividades.length) return [];
    const ocorrencias = [];
    let pagina;
    do {
        pagina = await conferirResposta(obterCliente().from('ocorrencias').select('*,categorias(nome,icone)').in('id_atividade', atividades.map(function (item) { return item.id_atividade; })).neq('situacao', 'CANCELADA').gte('data', inicio).lte('data', fim).order('data').order('horario').order('id_ocorrencia').range(ocorrencias.length, ocorrencias.length + 999));
        ocorrencias.push(...pagina);
    } while (pagina.length === 1000);
    return ocorrencias.map(function (item) {
        const tipo = atividades.find(function (a) { return a.id_atividade === item.id_atividade; }).tipo;
        const instante = item.data + 'T' + item.horario + '-03:00';
        const estado = item.situacao === 'CANCELADA' ? 'CANCELADO' : item.situacao === 'CONCLUIDA' ? 'CONCLUIDO' : item.data < hojeAgenda() ? 'SEM_CONFIRMACAO' : new Date(instante) > new Date() ? 'PROGRAMADO' : 'AGUARDANDO';
        return { ...item, tipo, categoria: item.categorias.nome, icone: item.categorias.icone, horario: item.horario.slice(0, 5), data_hora_prevista: instante, estado };
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
    await executarOperacao('alterar_dados_pessoais', { p_usuario: pessoa, p_nome: dados.nome_completo,
        p_exibicao: dados.nome_exibicao || null, p_nascimento: dados.data_nascimento || null,
        p_telefone: dados.telefone || null, p_contato: dados.nome_contato_emergencia || null,
        p_emergencia: dados.telefone_contato_emergencia || null, p_observacoes: dados.observacoes || null });
}
