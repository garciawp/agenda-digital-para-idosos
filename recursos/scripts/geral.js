function lerPreferencia(nome, valorPadrao) {
    try { return localStorage.getItem(nome) || valorPadrao; }
    catch { return valorPadrao; }
}

function guardarPreferencia(nome, valor) {
    try { localStorage.setItem(nome, valor); }
    catch { /* A preferência continua aplicada nesta página. */ }
}

function aplicarPreferencias() {
    const aparencia = lerPreferencia('agenda.aparencia', 'automatico');
    document.documentElement.dataset.aparencia = aparencia;
    document.documentElement.classList.toggle('texto-ampliado', lerPreferencia('agenda.texto-ampliado', 'nao') === 'sim');
    const escuro = aparencia === 'escuro' || (aparencia === 'automatico' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]').content = escuro ? '#19212b' : '#faf7f2';
}

let tempoAviso;
function mostrarAviso(mensagem) {
    const aviso = document.getElementById('aviso');
    aviso.textContent = mensagem;
    aviso.hidden = false;
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(function () { aviso.hidden = true; }, 10000);
}

function mostrarErro(formulario, mensagem) {
    const aviso = formulario.querySelector('.erro-formulario');
    aviso.textContent = mensagem;
    aviso.hidden = false;
    aviso.focus();
}

function prepararFormulario(formulario, aoEnviar) {
    formulario.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        if (formulario.dataset.enviando === 'sim' || !formulario.reportValidity()) return;
        formulario.querySelector('.erro-formulario').hidden = true;
        formulario.dataset.enviando = 'sim';
        formulario.setAttribute('aria-busy', 'true');
        const botao = formulario.querySelector('[type="submit"]');
        botao.disabled = true;
        try { await aoEnviar(formulario); }
        catch (erro) { mostrarErro(formulario, mensagemErro(erro)); }
        finally {
            formulario.dataset.enviando = 'nao';
            formulario.removeAttribute('aria-busy');
            botao.disabled = false;
        }
    });
}

async function executarAcao(botao, aoExecutar) {
    if (botao.disabled) return;
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    try { await aoExecutar(); }
    catch (erro) { mostrarAviso(mensagemErro(erro)); }
    finally { botao.disabled = false; botao.removeAttribute('aria-busy'); }
}

function pedirConfirmacao(titulo, descricao, aoConfirmar) {
    const dialogo = document.getElementById('dialogo');
    document.getElementById('titulo-dialogo').textContent = titulo;
    document.getElementById('descricao-dialogo').textContent = descricao;
    dialogo.returnValue = '';
    dialogo.addEventListener('close', function () {
        if (dialogo.returnValue === 'ok') executarAcao(document.getElementById('confirmar-dialogo'), aoConfirmar);
    }, { once: true });
    dialogo.showModal();
}

function preencherTexto(seletor, texto, raiz = document) {
    const elemento = raiz.querySelector(seletor);
    if (elemento) elemento.textContent = texto ?? '';
}

function repetirModelo(identificador) {
    return document.getElementById(identificador).content.cloneNode(true).firstElementChild;
}

function hojeAgenda() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function somarDias(data, quantidade) {
    const instante = new Date(data + 'T12:00:00Z');
    instante.setUTCDate(instante.getUTCDate() + quantidade);
    return instante.toISOString().slice(0, 10);
}

function formatarData(data, completo = false) {
    if (!data) return 'Não informado';
    return new Date(data + 'T12:00:00Z').toLocaleDateString('pt-BR', completo ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function preencherDados(dados) {
    document.querySelectorAll('[data-dado]').forEach(function (elemento) {
        const nome = elemento.dataset.dado;
        elemento.textContent = nome === 'data_nascimento' ? formatarData(dados[nome]) : (dados[nome] || 'Não informado');
    });
    preencherTexto('.pessoa-perfil h2', nomePessoa(dados));
}

function preencherCampos(formulario, dados) {
    for (const [nome, valor] of Object.entries(dados)) {
        const campo = formulario.elements.namedItem(nome);
        if (campo && 'value' in campo && campo.type !== 'password') campo.value = valor ?? '';
    }
}

async function prepararPreferencias() {
    const formulario = document.querySelector('[data-formulario="preferencias"]');
    const pessoa = contextoAtual.usuario;
    formulario.elements.fonte_ampliada.checked = pessoa.fonte_ampliada;
    formulario.elements.avisos_internos.checked = pessoa.avisos_internos;
    formulario.elements.aparencia.value = lerPreferencia('agenda.aparencia', 'automatico');
    prepararFormulario(formulario, async function () {
        await conferirResposta(obterCliente().from('usuarios').update({
            fonte_ampliada: formulario.elements.fonte_ampliada.checked,
            avisos_internos: formulario.elements.avisos_internos.checked
        }).eq('id_usuario', contextoAtual.usuario.id_usuario));
        guardarPreferencia('agenda.texto-ampliado', formulario.elements.fonte_ampliada.checked ? 'sim' : 'nao');
        guardarPreferencia('agenda.aparencia', formulario.elements.aparencia.value);
        aplicarPreferencias();
        mostrarAviso('Preferências salvas. As cores escolhidas ficam neste navegador.');
    });
}

const categoriasVisuais = {
    'Medicamento': 'medicamento', 'Aniversário': 'aniversario', 'Igreja': 'igreja',
    'Consulta': 'consulta', 'Exame': 'exame', 'Atividade física': 'atividade-fisica',
    'Família': 'familia', 'Lazer': 'lazer', 'Outros': 'outros'
};

function preencherCategoria(cartao, atividade) {
    cartao.dataset.categoria = categoriasVisuais[atividade.categoria] || 'outros';
    preencherTexto('[data-campo="categoria"]', atividade.categoria, cartao);
    preencherTexto('[data-campo="icone"]', atividade.icone, cartao);
}

function criarCartao(atividade, modelo, aoAtualizar) {
    const cartao = repetirModelo(modelo);
    preencherCategoria(cartao, atividade);
    preencherTexto('[data-campo="titulo"]', atividade.titulo, cartao);
    preencherTexto('[data-campo="horario"]', atividade.horario, cartao);
    cartao.querySelector('time').dateTime = atividade.data_hora_prevista;
    preencherTexto('[data-campo="dose"]', atividade.dose, cartao);
    cartao.querySelector('[data-campo="dose"]').hidden = !atividade.dose;
    const local = cartao.querySelector('.local-cartao');
    if (local) {
        local.hidden = !atividade.local;
        preencherTexto('[data-campo="local"]', atividade.local, cartao);
    }
    preencherTexto('[data-campo="informacoes"]', [atividade.instrucoes_medicamento, atividade.observacoes].filter(Boolean).join('\n') || 'Sem orientações adicionais.', cartao);
    const etiquetas = {
        CONCLUIDO: [atividade.tipo === 'MEDICAMENTO' ? 'Tomado' : 'Concluído', 'concluido', 'check_circle'],
        CANCELADO: ['Cancelado', 'neutro', 'cancel'],
        SEM_CONFIRMACAO: ['Sem confirmação', 'aguardando', 'help'],
        AGUARDANDO: ['Aguardando confirmação', 'aguardando', 'schedule'],
        PROGRAMADO: ['Programado', 'neutro', 'schedule']
    };
    const [texto, classe, icone] = etiquetas[atividade.estado];
    cartao.querySelector('.etiqueta').className = 'etiqueta ' + classe;
    preencherTexto('[data-campo="estado"]', texto, cartao);
    preencherTexto('[data-campo="icone-estado"]', icone, cartao);
    const confirmar = cartao.querySelector('[data-acao="confirmar"]');
    const concluida = atividade.estado === 'CONCLUIDO';
    if (confirmar) {
        confirmar.hidden = atividade.estado === 'CANCELADO' || atividade.data > hojeAgenda();
        confirmar.classList.toggle('principal', !concluida);
        confirmar.classList.toggle('contorno', concluida);
        preencherTexto('.texto-botao', concluida ? 'Desfazer confirmação' : (atividade.tipo === 'MEDICAMENTO' ? 'Já tomei' : 'Concluí'), confirmar);
        preencherTexto('.icone', concluida ? 'undo' : 'check', confirmar);
        confirmar.addEventListener('click', function () {
            const gravar = async function () {
                await confirmarOcorrencia(atividade, !concluida);
                await aoAtualizar();
                mostrarAviso(concluida ? 'Confirmação desfeita.' : 'Confirmação registrada.');
            };
            if (concluida) pedirConfirmacao('Desfazer confirmação?', 'A atividade voltará a aparecer sem confirmação. O registro voltará a ficar sem confirmação.', gravar);
            else executarAcao(confirmar, gravar);
        });
    }
    const historico = cartao.querySelector('[data-historico]');
    preencherTexto('[data-campo="historico"]', atividade.confirmada_em ? 'Confirmada em ' + new Date(atividade.confirmada_em).toLocaleString('pt-BR') : 'Ainda não há confirmação registrada.', cartao);
    return cartao;
}

async function prepararInicio() {
    const perfil = contextoAtual.usuario.tipo_perfil;
    const nome = perfil === 'IDOSO' ? nomePessoa(contextoAtual.usuario) : nomePessoa(vinculoAtual);
    preencherTexto('main h1', perfil === 'IDOSO' ? 'Olá, ' + nome : 'Agenda de ' + nome);
    document.title = (perfil === 'IDOSO' ? 'Início' : 'Agenda de ' + nome) + ' | Agenda Digital para Idosos';
    preencherTexto('[data-data-hoje]', formatarData(hojeAgenda(), true));
    async function atualizar() {
        const hoje = hojeAgenda();
        const atividades = await consultarAgenda(hoje, somarDias(hoje, 7));
        const dia = atividades.filter(function (item) { return item.data === hoje && item.estado !== 'CANCELADO'; });
        const pendentes = dia.filter(function (item) { return item.estado !== 'CONCLUIDO'; });
        const concluidas = dia.filter(function (item) { return item.estado === 'CONCLUIDO'; });
        const destaque = document.getElementById('atividade-destaque');
        const restantes = document.getElementById('atividades-restantes');
        const confirmadas = document.getElementById('atividades-confirmadas');
        destaque.replaceChildren(); restantes.replaceChildren(); confirmadas.replaceChildren();
        if (pendentes.length) destaque.append(criarCartao(pendentes[0], 'modelo-destaque', atualizar));
        pendentes.slice(1).forEach(function (item) { restantes.append(criarCartao(item, 'modelo-cartao', atualizar)); });
        concluidas.forEach(function (item) { confirmadas.append(criarCartao(item, 'modelo-cartao', atualizar)); });
        document.getElementById('secao-restantes').hidden = pendentes.length < 2;
        document.getElementById('secao-confirmadas').hidden = !concluidas.length;
        preencherTexto('#secao-confirmadas > summary', 'Confirmadas hoje (' + concluidas.length + ')');
        document.getElementById('inicio-vazio').hidden = dia.length > 0;
        const lembrete = document.querySelector('.lembrete');
        const aguardando = pendentes.filter(function (item) { return item.estado === 'AGUARDANDO'; }).length;
        lembrete.hidden = !contextoAtual.usuario.avisos_internos || !aguardando;
        preencherTexto('p', aguardando === 1 ? 'Uma atividade aguarda confirmação.' : aguardando + ' atividades aguardam confirmação.', lembrete);
        const proximas = atividades.filter(function (item) { return item.data > hoje && item.estado !== 'CANCELADO'; }).slice(0, 3);
        const destino = document.getElementById('lista-proximos-dias');
        destino.replaceChildren();
        proximas.forEach(function (item) {
            const cartao = repetirModelo('modelo-proximo-dia');
            preencherCategoria(cartao, item);
            preencherTexto('h3', item.titulo, cartao);
            preencherTexto('.data-proxima', formatarData(item.data, true), cartao);
            preencherTexto('[data-campo="horario"]', item.horario, cartao);
            cartao.querySelector('a').href = enderecoPagina(perfil === 'IDOSO' ? 'idoso/agenda/agenda.html' : 'responsavel/agenda/agenda.html', { data: item.data, idoso: perfil === 'RESPONSAVEL' ? idIdosoAtual : null });
            destino.append(cartao);
        });
        document.getElementById('proximos-vazio').hidden = proximas.length > 0;
    }
    document.querySelectorAll('[data-acao="atualizar"]').forEach(function (botao) { botao.addEventListener('click', function () { executarAcao(botao, atualizar); }); });
    await atualizar();
}

aplicarPreferencias();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarPreferencias);
document.querySelectorAll('[data-acao="mostrar-senha"]').forEach(function (botao) {
    botao.addEventListener('click', function () {
        const campo = document.getElementById(botao.dataset.destino);
        const mostrar = campo.type === 'password';
        campo.type = mostrar ? 'text' : 'password';
        botao.setAttribute('aria-pressed', String(mostrar));
        botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
        preencherTexto('.icone', mostrar ? 'visibility_off' : 'visibility', botao);
    });
});
document.querySelectorAll('[data-acao="sair"]').forEach(function (botao) {
    botao.addEventListener('click', function () {
        executarAcao(botao, async function () {
            const { error } = await obterCliente().auth.signOut({ scope: 'local' });
            if (error) throw error;
            location.replace(enderecoPagina('paginas/entrar/entrar.html'));
        });
    });
});
document.querySelector('[data-tentar-novamente]')?.addEventListener('click', function () { location.reload(); });

