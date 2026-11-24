iniciarPagina(async function(){prepararFormulario(document.querySelector('form[data-formulario]'),async function(f){
 const {error}=await obterCliente().auth.resetPasswordForEmail(f.elements.email.value.trim(),{redirectTo:enderecoPagina('paginas/redefinir-senha/redefinir-senha.html')});if(error)throw error;
 const resultado=document.getElementById('resultado-formulario');resultado.hidden=false;resultado.textContent='Se houver uma conta para esse endereço, você receberá o link para escolher uma nova senha. Confira também o spam.';
});});
