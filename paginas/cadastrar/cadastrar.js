iniciarPagina(async function(){prepararFormulario(document.querySelector('form[data-formulario]'),async function(f){
 if(f.elements.senha.value!==f.elements.repetir_senha.value)throw new Error('As senhas devem ser iguais.');
 const {error}=await obterCliente().auth.signUp({email:f.elements.email.value.trim(),password:f.elements.senha.value,options:{data:{nome_completo:f.elements.nome_completo.value.trim(),tipo_perfil:f.elements.tipo_perfil.value},emailRedirectTo:enderecoPagina('paginas/entrar/entrar.html')}});
 if(error)throw error;f.elements.senha.value='';f.elements.repetir_senha.value='';const resultado=document.getElementById('resultado-formulario');resultado.hidden=false;resultado.textContent='Solicitação recebida. Confira seu e-mail e a pasta de spam para confirmar o cadastro. Se já possui uma conta, entre ou solicite a recuperação de senha.';resultado.tabIndex=-1;resultado.focus();
});});
