iniciarPagina(async function(sessao){
 if(sessao){await carregarContexto();location.replace(enderecoPagina(entradaDoPerfil(contextoAtual.usuario.tipo_perfil)));return;}
 prepararFormulario(document.querySelector('form[data-formulario]'),async function(f){
  const {error}=await obterCliente().auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.senha.value});
  if(error)throw error;f.elements.senha.value='';await carregarContexto();abrirPagina(entradaDoPerfil(contextoAtual.usuario.tipo_perfil));
 });
});
