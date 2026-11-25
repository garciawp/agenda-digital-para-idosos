const enderecoRaiz = new URL('../../', document.currentScript.src);
let clienteSupabase;
let contextoAtual;
let idIdosoAtual;
let vinculoAtual;
let sessaoRecuperacao = false;

function obterCliente() {
    if (location.protocol === 'file:') {
        throw new Error('Abra o site pelo endereço local indicado no LEIA-ME. O login por e-mail precisa de um endereço HTTP.');
    }
    if (!window.supabase) throw new Error('A biblioteca de conexão não foi carregada. Confira os arquivos do site.');
    if (!clienteSupabase) {
        clienteSupabase = window.supabase.createClient(configuracaoSupabase.endereco, configuracaoSupabase.chavePublicavel, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
            global: {
                fetch: function (endereco, opcoes) {
                    if (!AbortSignal.timeout || (opcoes?.signal && !AbortSignal.any)) return fetch(endereco, opcoes);
                    const sinal = AbortSignal.timeout(20000);
                    return fetch(endereco, { ...opcoes, signal: opcoes?.signal ? AbortSignal.any([opcoes.signal, sinal]) : sinal });
                }
            }
        });
        clienteSupabase.auth.onAuthStateChange(function (evento) {
            if (evento === 'PASSWORD_RECOVERY') sessaoRecuperacao = true;
            if (evento === 'SIGNED_OUT') sessaoRecuperacao = false;
            if (evento === 'SIGNED_OUT' && document.querySelector('main').dataset.perfil) {
                location.replace(new URL('paginas/entrar/entrar.html', enderecoRaiz));
            }
        });
    }
    return clienteSupabase;
}

function mensagemErro(erro) {
    const codigos = {
        invalid_credentials: 'E-mail ou senha incorretos.',
        email_not_confirmed: 'Confirme o e-mail recebido antes de entrar.',
        user_already_exists: 'Não foi possível concluir o cadastro. Se já tem conta, tente entrar ou recuperar sua senha.',
        weak_password: 'Escolha uma senha mais forte e confira as orientações do campo.',
        over_email_send_rate_limit: 'O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente.',
        over_request_rate_limit: 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.',
        email_address_not_authorized: 'O Supabase ainda não permite enviar e-mails para esse endereço. É necessário configurar o remetente do projeto.',
        otp_expired: 'O link expirou ou já foi utilizado. Solicite outro e-mail.',
        same_password: 'A nova senha deve ser diferente da senha atual.'
    };
    if (codigos[erro?.code]) return codigos[erro.code];
    if (erro?.message === 'Email not confirmed') return codigos.email_not_confirmed;
    if (erro?.message === 'Invalid login credentials') return codigos.invalid_credentials;
    if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(erro?.code)) {
        return 'O banco ainda não está instalado por completo. Confira a execução dos três arquivos SQL no projeto novo.';
    }
    if (erro?.code === '23505') return erro.message?.includes('duplicate key') ? 'Já existe um registro com esses dados.' : erro.message;
    if (erro?.code === 'P0001') return erro.message;
    if (erro?.code === '22023') return erro.message;
    if (erro?.code === '42501') return 'Você não tem permissão para essa operação. Confira sua conta e atualize a página.';
    if (erro?.code === '23514') return 'Confira os dados informados. Uma regra do banco impediu a gravação.';
    if (erro?.code === '23502') return 'Preencha todos os campos obrigatórios.';
    if (['22P02', '22007', '22008'].includes(erro?.code)) return 'Confira as datas, os horários e os números informados.';
    if (erro instanceof TypeError || ['AbortError', 'TimeoutError'].includes(erro?.name)) {
        return 'Não foi possível concluir a conexão. Confira sua internet e tente novamente.';
    }
    return erro instanceof Error && !erro.code ? erro.message : 'Não foi possível concluir a operação. Tente novamente ou confira a configuração do Supabase.';
}

async function executarOperacao(nome, parametros = {}) {
    const { data, error } = await obterCliente().rpc(nome, parametros);
    if (error) throw error;
    return data;
}

function enderecoPagina(caminho, parametros = {}) {
    const endereco = new URL(caminho, enderecoRaiz);
    for (const [nome, valor] of Object.entries(parametros)) {
        if (valor !== undefined && valor !== null) endereco.searchParams.set(nome, valor);
    }
    return endereco.href;
}

function abrirPagina(caminho, parametros = {}) {
    location.href = enderecoPagina(caminho, parametros);
}

function entradaDoPerfil(perfil) {
    return perfil === 'IDOSO' ? 'idoso/inicio/inicio.html' : 'responsavel/inicio/inicio.html';
}

function nomePessoa(pessoa) {
    return pessoa.nome_exibicao || pessoa.nome_completo;
}

async function carregarContexto() {
    const cliente = obterCliente();
    const { data: acesso, error: erroAcesso } = await cliente.auth.getUser();
    if (erroAcesso) throw erroAcesso;
    let { data: usuario, error } = await cliente.from('usuarios').select('*').eq('id_usuario', acesso.user.id).maybeSingle();
    if (error) throw error;
    if (!usuario) {
        const cadastro = acesso.user.user_metadata ?? {};
        if (!['IDOSO', 'RESPONSAVEL'].includes(cadastro.tipo_perfil) || !cadastro.nome_completo) throw new Error('Esta conta não possui os dados de cadastro da agenda.');
        const resultado = await cliente.from('usuarios').insert({
            id_usuario: acesso.user.id, tipo_perfil: cadastro.tipo_perfil, nome_completo: cadastro.nome_completo,
            nome_exibicao: cadastro.nome_exibicao ?? null, data_nascimento: cadastro.data_nascimento ?? null,
            telefone: cadastro.telefone ?? null, contato_emergencia: cadastro.contato_emergencia ?? null,
            telefone_emergencia: cadastro.telefone_emergencia ?? null
        }).select().single();
        if (resultado.error && resultado.error.code !== '23505') throw resultado.error;
        usuario = resultado.data;
        if (!usuario) {
            const outraAba = await cliente.from('usuarios').select('*').eq('id_usuario', acesso.user.id).single();
            if (outraAba.error) throw outraAba.error;
            usuario = outraAba.data;
        }
    }
    const [vinculos, categorias] = await Promise.all([cliente.rpc('consultar_vinculos'), cliente.from('categorias').select('*').order('id_categoria')]);
    if (vinculos.error) throw vinculos.error;
    if (categorias.error) throw categorias.error;
    contextoAtual = { usuario: { ...usuario, email: acesso.user.email }, vinculos: vinculos.data, categorias: categorias.data };
    if (!contextoAtual?.usuario) throw new Error('Não foi possível encontrar o perfil desta conta. Confira o cadastro e os scripts SQL.');
    return contextoAtual;
}

async function iniciarPagina(aoCarregar) {
    const principal = document.querySelector('main');
    const estado = document.getElementById('estado-conexao');
    const perfil = principal.dataset.perfil;
    try {
        const { data, error } = await obterCliente().auth.getSession();
        if (error) throw error;
        if (perfil) {
            if (!data.session) { location.replace(enderecoPagina('paginas/entrar/entrar.html')); return; }
            await carregarContexto();
            if (contextoAtual.usuario.tipo_perfil !== perfil) {
                location.replace(enderecoPagina(entradaDoPerfil(contextoAtual.usuario.tipo_perfil))); return;
            }
            guardarPreferencia('agenda.texto-ampliado', contextoAtual.usuario.fonte_ampliada ? 'sim' : 'nao');
            aplicarPreferencias();
            document.querySelector('.usuario-cabecalho').textContent = nomePessoa(contextoAtual.usuario) + ' | ' + (perfil === 'IDOSO' ? 'Minha agenda' : 'Responsável');
            const pagina = principal.dataset.pagina;
            if (perfil === 'IDOSO') idIdosoAtual = contextoAtual.usuario.id_usuario;
            const idSolicitado = new URLSearchParams(location.search).get('idoso');
            const geral = pagina === 'inicio' || pagina === 'agenda';
            if (perfil === 'RESPONSAVEL' && (!geral || idSolicitado) && !['pessoas', 'perfil', 'conta', 'editar-perfil', 'vincular'].includes(pagina)) {
                idIdosoAtual = idSolicitado;
                vinculoAtual = contextoAtual.vinculos.find(function (vinculo) { return vinculo.id_idoso === idIdosoAtual && vinculo.situacao === 'ACEITO'; });
                if (!idIdosoAtual || !vinculoAtual) {
                    location.replace(enderecoPagina('responsavel/pessoas/pessoas.html')); return;
                }
                preencherTexto('.pessoa-selecionada strong', nomePessoa(vinculoAtual));
                preencherTexto('.pessoa-selecionada .retrato-pessoa', nomePessoa(vinculoAtual).charAt(0).toUpperCase());
                document.querySelectorAll('main a[href]').forEach(function (ligacao) {
                    const endereco = new URL(ligacao.href);
                    if (/\/responsavel\/(inicio|agenda|atividades|cadastrar-atividade|editar-atividade|dados-do-idoso|editar-idoso)\//.test(endereco.pathname)) {
                        endereco.searchParams.set('idoso', idIdosoAtual);
                        ligacao.href = endereco.href;
                    }
                });
            }
            if (perfil === 'RESPONSAVEL' && geral) {
                document.querySelectorAll('[data-pessoa-individual]').forEach(function (elemento) { elemento.hidden = !vinculoAtual; });
                document.querySelectorAll('[data-todas-pessoas]').forEach(function (elemento) { elemento.hidden = Boolean(vinculoAtual); });
            }
        }
        await aoCarregar(data.session);
        principal.hidden = false;
        if (estado) estado.hidden = true;
    } catch (erro) {
        if (estado) {
            estado.hidden = false;
            estado.querySelector('[data-mensagem]').textContent = mensagemErro(erro);
            estado.querySelector('[data-tentar-novamente]').hidden = false;
        } else mostrarAviso(mensagemErro(erro));
    }
}
