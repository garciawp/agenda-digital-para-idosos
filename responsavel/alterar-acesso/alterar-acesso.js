iniciarPagina(async function(){const f=document.querySelector('form[data-formulario]');f.elements.email.value=contextoAtual.usuario.email;prepararFormulario(f,async function(){
  const dados={};const email=f.elements.email.value.trim();if(email!==contextoAtual.usuario.email)dados.email=email;if(f.elements.nova_senha.value)dados.password=f.elements.nova_senha.value;if(!Object.keys(dados).length)throw new Error('Informe um novo e-mail ou uma nova senha.');
  const verificacao=await obterCliente().auth.signInWithPassword({email:contextoAtual.usuario.email,password:f.elements.senha_atual.value});if(verificacao.error)throw verificacao.error;
  const {error}=await obterCliente().auth.updateUser(dados,{emailRedirectTo:enderecoPagina('paginas/entrar/entrar.html')});if(error)throw error;f.elements.senha_atual.value='';f.elements.nova_senha.value='';mostrarAviso(dados.email?'Alteração solicitada. Confira as mensagens de confirmação nos e-mails envolvidos.':'Senha alterada.');
 });});
