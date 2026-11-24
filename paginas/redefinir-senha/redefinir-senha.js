iniciarPagina(async function(sessao){prepararFormulario(document.querySelector('form[data-formulario]'),async function(f){
 if(!sessao)throw new Error('Abra o link recebido por e-mail. Se ele expirou, solicite outro.');
 if(f.elements.senha.value!==f.elements.repetir_senha.value)throw new Error('As senhas devem ser iguais.');
 const {error}=await obterCliente().auth.updateUser({password:f.elements.senha.value});if(error)throw error;
 f.reset();await obterCliente().auth.signOut({scope:'local'});document.getElementById('resultado-formulario').hidden=false;preencherTexto('#resultado-formulario','Senha alterada. Entre novamente com sua nova senha.');
});});
