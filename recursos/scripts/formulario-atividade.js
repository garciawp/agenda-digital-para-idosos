async function prepararAtividade(editando) {
    const f=document.querySelector('form[data-formulario]');
    const tipo=f.elements.tipo, repeticao=f.elements.frequencia;
    const linhas=[...document.querySelectorAll('.linha-horario')];
    const identificador=editando?Number(new URLSearchParams(location.search).get('atividade')):null;
    let original;
    function grupo(id,visivel){const elemento=document.getElementById(id);elemento.hidden=!visivel;elemento.querySelectorAll('input,textarea').forEach(campo=>campo.disabled=!visivel);}
    function atualizarTipo(){const medicamento=tipo.value==='MEDICAMENTO';grupo('campos-medicamento',medicamento);f.elements.dose.required=medicamento;[...f.elements.id_categoria.options].forEach(opcao=>opcao.hidden=medicamento?opcao.textContent!=='Medicamento':opcao.textContent==='Medicamento');if(f.elements.id_categoria.selectedOptions[0].hidden)f.elements.id_categoria.value=medicamento?'1':'9';}
    function atualizarRepeticao(){const unica=repeticao.value==='UNICA';grupo('campo-termino',!unica);grupo('campo-semana',repeticao.value==='SEMANAL');document.getElementById('adicionar-horario').hidden=unica;if(unica)linhas.slice(1).forEach(linha=>{linha.hidden=true;linha.querySelector('input').disabled=true;});}
    tipo.addEventListener('change',atualizarTipo);repeticao.addEventListener('change',atualizarRepeticao);
    document.getElementById('adicionar-horario').addEventListener('click',function(){const linha=linhas.find(item=>item.hidden);if(!linha){mostrarAviso('Você pode informar até 12 horários.');return;}linha.hidden=false;linha.querySelector('input').disabled=false;linha.querySelector('input').focus();});
    linhas.forEach(linha=>linha.querySelector('button').addEventListener('click',function(){if(linhas.filter(item=>!item.hidden).length===1){mostrarAviso('Mantenha pelo menos um horário.');return;}linha.hidden=true;linha.querySelector('input').disabled=true;}));
    if(editando){original=(await consultarAtividades()).find(item=>item.id_atividade===identificador);if(!original)throw new Error('Atividade não encontrada. Volte para Organizar atividades.');preencherCampos(f,original);tipo.disabled=true;const horarios=[...new Set(original.horarios.map(item=>item.horario.slice(0,5)))];linhas.forEach((linha,i)=>{linha.hidden=i>=horarios.length;linha.querySelector('input').disabled=linha.hidden;linha.querySelector('input').value=horarios[i]||'';});f.querySelectorAll('[name="dias_semana"]').forEach(campo=>campo.checked=original.horarios.some(h=>h.dia_semana===Number(campo.value)));}
    else f.elements.data_inicio.value=hojeAgenda();
    atualizarTipo();atualizarRepeticao();
    prepararFormulario(f,async function(){
        const dados=Object.fromEntries(new FormData(f));dados.tipo=tipo.value;
        if(dados.data_fim&&dados.data_fim<dados.data_inicio)throw new Error('O término deve ser igual ou posterior ao início.');
        const dias=repeticao.value==='SEMANAL'?[...f.querySelectorAll('[name="dias_semana"]:checked')].map(campo=>Number(campo.value)):[null];
        if(!dias.length)throw new Error('Escolha pelo menos um dia da semana.');
        const horarios=linhas.filter(linha=>!linha.hidden).map(linha=>linha.querySelector('input').value);
        if(new Set(horarios).size!==horarios.length)throw new Error('Os horários devem ser diferentes.');
        dados.horarios=dias.flatMap(dia=>horarios.map(horario=>({horario,dia_semana:dia})));
        dados.id_categoria=Number(dados.id_categoria);dados.data_fim=repeticao.value==='UNICA'?dados.data_inicio:(dados.data_fim||null);
        dados.dose=tipo.value==='MEDICAMENTO'?dados.dose:null;dados.instrucoes_medicamento=tipo.value==='MEDICAMENTO'?(dados.instrucoes_medicamento||null):null;
        await executarOperacao('salvar_atividade',{p_idoso:idIdosoAtual,p_dados:dados,p_atividade:identificador});
        abrirPagina('responsavel/atividades/atividades.html',{idoso:idIdosoAtual});
    });
}
