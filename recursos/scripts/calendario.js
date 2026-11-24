async function prepararAgenda() {
    const campo = document.getElementById('data-agenda');
    const calendario = document.querySelector('.painel-calendario');
    const dias = [...calendario.querySelectorAll('button.dia')];
    let mes; let atividades = []; let numeroConsulta = 0;
    campo.min = somarDias(hojeAgenda(), -1826);
    campo.max = somarDias(hojeAgenda(), 1826);
    function desenharCalendario() {
        const primeiro = new Date(mes + '-01T12:00:00Z');
        const quantidade = new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth()+1, 0)).getUTCDate();
        preencherTexto('h2', primeiro.toLocaleDateString('pt-BR', {month:'long',year:'numeric',timeZone:'UTC'}), calendario);
        dias.forEach(function(botao, indice) {
            const data = mes + '-' + String(indice+1).padStart(2,'0');
            botao.hidden = indice >= quantidade;
            botao.disabled = data < campo.min || data > campo.max;
            botao.dataset.data = data;
            botao.classList.toggle('com-atividades', atividades.some(item=>item.data===data && item.estado!=='CANCELADO'));
            botao.classList.toggle('hoje', data===hojeAgenda());
            botao.setAttribute('aria-pressed', String(data===campo.value));
            botao.setAttribute('aria-label', formatarData(data,true));
            botao.style.gridColumnStart = indice===0 ? String(primeiro.getUTCDay()+1) : '';
        });
    }
    function mostrarDia() {
        const lista=document.getElementById('lista-agenda');lista.replaceChildren();
        const registros=atividades.filter(item=>item.data===campo.value);
        registros.forEach(item=>lista.append(criarCartao(item,'modelo-cartao',atualizar)));
        preencherTexto('#titulo-data',formatarData(campo.value,true));
        preencherTexto('#quantidade-atividades',registros.length+(registros.length===1?' atividade':' atividades'));
        document.getElementById('agenda-vazia').hidden=registros.length>0;
        desenharCalendario();
    }
    async function carregarMes(mesEscolhido) {
        const numero=++numeroConsulta;
        const inicio=mesEscolhido+'-01';
        const primeiro=new Date(inicio+'T12:00:00Z');
        const fim=new Date(Date.UTC(primeiro.getUTCFullYear(),primeiro.getUTCMonth()+1,0)).toISOString().slice(0,10);
        const registros=await consultarAgenda(inicio<campo.min?campo.min:inicio,fim>campo.max?campo.max:fim);
        if(numero!==numeroConsulta)return false;
        atividades=registros;mes=mesEscolhido;return true;
    }
    async function escolher(data) {
        if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||data<campo.min||data>campo.max) return;
        if(data.slice(0,7)!==mes && !await carregarMes(data.slice(0,7)))return;
        campo.value=data;mostrarDia();
        const endereco=new URL(location.href);endereco.searchParams.set('data',data);history.replaceState(null,'',endereco);
    }
    async function atualizar(){if(await carregarMes(campo.value.slice(0,7)))mostrarDia();}
    function acao(botao,funcao){botao.addEventListener('click',function(){executarAcao(botao,funcao);});}
    const abrir=document.querySelector('[data-acao="abrir-calendario"]');
    acao(abrir,async function(){calendario.hidden=!calendario.hidden;abrir.setAttribute('aria-expanded',String(!calendario.hidden));preencherTexto('.texto-botao',calendario.hidden?'Abrir calendário':'Fechar calendário',abrir);});
    dias.forEach(botao=>acao(botao,()=>escolher(botao.dataset.data)));
    document.querySelectorAll('[data-acao="mudar-dia"]').forEach(botao=>acao(botao,()=>escolher(somarDias(campo.value,Number(botao.dataset.passo)))));
    document.querySelectorAll('[data-acao="mudar-mes"]').forEach(botao=>acao(botao,async function(){const data=new Date(mes+'-01T12:00:00Z');data.setUTCMonth(data.getUTCMonth()+Number(botao.dataset.passo));const proximo=data.toISOString().slice(0,7);if(proximo>=campo.min.slice(0,7)&&proximo<=campo.max.slice(0,7))await escolher(proximo===campo.min.slice(0,7)?campo.min:proximo+'-01');}));
    document.querySelectorAll('[data-acao="atualizar"]').forEach(botao=>acao(botao,atualizar));
    acao(document.querySelector('[data-acao="voltar-hoje"]'),()=>escolher(hojeAgenda()));
    campo.addEventListener('change',function(){if(campo.validity.valid&&campo.value)executarAcao(abrir,()=>escolher(campo.value));});
    const solicitada=new URLSearchParams(location.search).get('data');
    await escolher(solicitada&&solicitada>=campo.min&&solicitada<=campo.max?solicitada:hojeAgenda());
}
